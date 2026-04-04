import { useSyncExternalStore } from "react";
import { studentStore, graduandStore } from "@/stores/studentStore";

export const useStudents = () =>
  useSyncExternalStore(studentStore.subscribe, studentStore.getStudents);

export const useGraduands = () =>
  useSyncExternalStore(graduandStore.subscribe, graduandStore.getGraduands);
