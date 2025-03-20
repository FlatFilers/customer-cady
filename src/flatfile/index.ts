import FlatfileListener, { Listener } from "@flatfile/listener";
import { configureSpace } from "@flatfile/plugin-space-configure";
import { ExcelExtractor } from "@flatfile/plugin-xlsx-extractor";

import workbook from "./blueprints/workbooks/workbook";
import { studentsHook } from "./hooks/students.hook";
import { extractStudentsAction } from "./actions/extract-students.action";
import { mergeParentsAction } from "./actions/merge-parents.action";
import { addEphemeralWorkbookActions } from "./jobs/ephemeral-workbooks.jobs";
import { populateMissingFieldsAction } from "./actions/populate-missing-fields.action";

export default function (listener: FlatfileListener) {
  // Enable the extraction of Excel files
  listener.use(ExcelExtractor());

  // Configure the space with the workbook
  listener.use(
    configureSpace({
      workbooks: [workbook],
      space: {
        metadata: {
          theme: {
            root: {
              primaryColor: "#bb4a92",
            },
            sidebar: {
              logo: "https://asset.brandfetch.io/idxgCT4I1G/idMbiY5Rm1.png",
              backgroundColor: "#ffffff",
              focusTextColor: "#ffffff",
              focusBgColor: "#bb4a92",
              titleColor: "#000000",
              textColor: "#000000"
            },
          }
        }
      }
    }),
  );

  // Enable the records hook on the students sheet
  listener.use(studentsHook);

  // Add actions to ephemeral workbooks
  listener.use(addEphemeralWorkbookActions);

  // enable the Action Job Handlers
  listener.use(extractStudentsAction);
  listener.use(mergeParentsAction);
  listener.use(populateMissingFieldsAction);
}