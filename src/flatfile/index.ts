import FlatfileListener, { Listener } from "@flatfile/listener";
import { configureSpace } from "@flatfile/plugin-space-configure";
import { ExcelExtractor } from "@flatfile/plugin-xlsx-extractor";
import { instrumentRequests } from "../../support/instrument.requests";

import "../../support/requests/records/global.collect.macros";
import workbook from "./blueprints/workbooks/workbook";
import { studentsHook } from "./hooks/students.hook";

instrumentRequests();

export default function (listener: FlatfileListener) {
  // Globally installed plugins
  listener.use(ExcelExtractor());

  listener.use(
    configureSpace({
      workbooks: [workbook],
    }),
  );

  listener.on("**", (event) => {
    console.log(`Received event: ${event.topic}`);
  });

  listener.use(studentsHook);
}
