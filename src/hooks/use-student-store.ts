import { useState, useEffect } from "react";
import { studentStore, graduandStore } from "@/stores/studentStore";

export const useStudents = () => {
  const [students, setStudents] = useState(studentStore.getStudents());
  useEffect(() => {
    const unsub = studentStore.subscribe(() => {
      setStudents([...studentStore.getStudents()]);
    });
    return unsub;
  }, []);
  return students;
};

export const useGraduands = () => {
  const [graduands, setGraduands] = useState(graduandStore.getGraduands());
  useEffect(() => {
    const unsub = graduandStore.subscribe(() => {
      setGraduands([...graduandStore.getGraduands()]);
    });
    return unsub;
  }, []);
  return graduands;
};
