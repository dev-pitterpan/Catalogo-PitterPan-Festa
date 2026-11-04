import { applicationConfig } from "../../packages/shared/next-config";
import { withWorkflow } from "workflow/next";
export default withWorkflow(applicationConfig("management"));
