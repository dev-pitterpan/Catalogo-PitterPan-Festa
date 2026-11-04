import { sleep } from "workflow";
import {
  begin,
  ready,
  download,
  products,
  orders,
  publish,
  finish,
  fail,
} from "./sync-steps";
export async function shopifySync(id: string) {
  "use workflow";
  try {
    await begin(id);
    let exported = false;
    for (let attempt = 0; attempt < 360; attempt++) {
      if (await ready(id)) {
        exported = true;
        break;
      }
      await sleep("10s");
    }
    if (!exported) throw new Error("Exportação demorou além do limite.");
    await download(id);
    let cursor = 0,
      done = false;
    for (let page = 0; page < 8000; page++) {
      const result = await products(id, cursor);
      if (result.done) {
        done = true;
        break;
      }
      cursor = result.cursor;
    }
    if (!done) throw new Error("Limite de produtos excedido.");
    let synced = false;
    for (let page = 0; page < 2000; page++) {
      const result = await orders(id);
      if (!result.more) {
        synced = true;
        break;
      }
      await sleep(result.busy ? "30s" : "1s");
    }
    if (!synced) throw new Error("Sincronização de pedidos incompleta.");
    await publish(id);
    await finish(id);
  } catch {
    await fail(id);
  }
}
