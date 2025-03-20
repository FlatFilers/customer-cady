import FlatfileListener, { Listener } from "@flatfile/listener";
import api, { Flatfile } from "@flatfile/api";
import { createPopulateMissingFieldsBlueprint } from "../actions/populate-missing-fields.action";
import { listenerCount } from "process";

export const addEphemeralWorkbookActions = (listener: FlatfileListener) => {
  listener.on("job:completed", {}, async (event) => {
    console.log("Job completed", event.payload.operation)
    // Only process extraction jobs
    if (!event.payload.operation?.startsWith("extract")) {
      console.log("Not an extract job", event.payload.operation)
      return;
    }

    try {

      // Get the file and workbook
      const { context: { fileId } } = event;
      if (!fileId) {
        console.log("No fileId found in event context");
        return;
      }

      const { data: file } = await api.files.get(fileId);
      if (!file || !file.workbookId) {
        console.log("No workbook associated with file");
        return;
      }

      const { data: workbook } = await api.workbooks.get(file.workbookId);
      if (!workbook) {
        console.log("Workbook not found");
        return;
      }

      console.log("Creating populate missing fields action", workbook.id)
      await api.actions.create({spaceId: event.context.spaceId, body: createPopulateMissingFieldsBlueprint(workbook.id)});

    } catch (error) {
      console.error("Error in post-extraction hook:", error);
      throw error;
    }
  });

}