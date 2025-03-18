import { jobHandler } from "@flatfile/plugin-job-handler";
import api, { Flatfile } from "@flatfile/api";

const barebonesBlueprint: Flatfile.Action = {
  operation: "populate-missing-fields",
  mode: "foreground",
  label: "↪ Populate Missing Fields",
  description: "Populate missing fields with preceding values",
  primary: true,
  confirm: true,
  mount: { type: "field" },
}

export const createPopulateStudentIdsBlueprint = (workbookId: string): Flatfile.ApiActionConfig => ({
  targetId: workbookId,
  ...barebonesBlueprint,
});


export const populateStudentIdsAction = jobHandler(`sheet:${barebonesBlueprint.operation}`, async (event, tick) => {
  const { workbookId, jobId, environmentId, spaceId, sheetId } = event.context;
  const { data: { records}} = await api.records.get(sheetId);


  const { data } = await api.jobs.get(event.context.jobId);
  const { params: { columnKey } } = data.subject as Flatfile.JobSubject.Collection;


  let previousValue = undefined;
  for (let i = 0; i < records.length; i++) {
    if (i === 0) continue;
    // if (!previousValue) continue;
    const record = records[i];
    const { values } = record;
    const { [columnKey]: { value: fieldValue } } = values;
    if (fieldValue === undefined || fieldValue === null || String(fieldValue).trim() === '') {
      values[columnKey].value = previousValue;
    } else {
      previousValue = fieldValue;
    }
  }

  await api.records.update(sheetId, records);
});