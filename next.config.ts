import { withWorkflow } from "workflow/next";
import { applicationConfig } from "./packages/shared/next-config";
// Compatibilidade dos deployments atuais; novos projetos usam apps/.
export default withWorkflow(applicationConfig());
