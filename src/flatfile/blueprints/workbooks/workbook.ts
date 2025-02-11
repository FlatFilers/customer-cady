import { Flatfile } from "@flatfile/api";
import { studentsSheet } from "../sheets/students.sheet";

const workbook: Flatfile.CreateWorkbookConfig = {
  name: "New Sheet",
  labels: ["pinned"],
  sheets: [studentsSheet],
};

export default workbook;
