import { Flatfile } from "@flatfile/api";
import { studentsSheet } from "../sheets/students.sheet";
import { extractStudentsBlueprint } from "../../actions/extract-students.action";
const workbook: Flatfile.CreateWorkbookConfig = {
  name: "New Sheet",
  labels: ["pinned"],
  sheets: [studentsSheet],
  actions: [extractStudentsBlueprint],
};

export default workbook;
