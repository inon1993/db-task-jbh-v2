import { open } from "node:fs/promises";

export const getAction = async (rl) => {
  let action = "";
  while (action !== "A" && action !== "S" && action !== "E") {
    action = await rl.question(
      "Hello! Press 'A' to add a user, 'S' to search for a user, or 'E' to exit. "
    );
    if (action === "A" || action === "S" || action === "E") {
      return action;
    }
  }
  rl.close();
};

export const setQuestions = async () => {
  const questions = [];
  const fhQuestions = await open("./questions.txt");
  for await (const line of fhQuestions.readLines()) {
    const q = line.split("|");
    questions.push({ question: q[0], field: q[1] });
  }
  return questions;
};

export const getUserInfo = async (rl, pathIndex) => {
  const questions = await setQuestions();
  let isValidAnswer = false;
  const user = {
    id: "",
    fname: "",
    lname: "",
  };

  for (const q of questions) {
    let answer = "";
    while (!isValidAnswer) {
      answer = await rl.question(q.question);
      isValidAnswer = await isValid(q.field, answer, pathIndex);
    }

    user[q.field] = answer;
    isValidAnswer = false;
  }

  rl.close();
  return user;
};

export const getIndex = async () => {
  let lines = 0;
  const file = await open("./db.txt");

  for await (const line of file.readLines()) {
    lines++;
  }

  return lines === 0 ? 0 : lines - 1;
};

export const isValid = async (field, answer, pathIndex) => {
  const idValidator = /^[0-9]{9}$/;
  const fullNameValidator = /^[a-zA-Z]{1,10}$/;
  let isValidAnswer = false;
  switch (field) {
    case "id":
      isValidAnswer = idValidator.test(answer);
      const index = await getUserIndex(answer, pathIndex);
      if (index) {
        console.log("ID already exists.");
        isValidAnswer = false;
      }
      break;
    case "fname":
    case "lname":
      isValidAnswer = fullNameValidator.test(answer);
      break;
  }

  return isValidAnswer;
};

export const getUserIndex = async (id, pathIndex) => {
  try {
    const fhIndex = await open(pathIndex);
    const map = new Map();
    for await (const line of fhIndex.readLines()) {
      map.set(line.split(":")[0], line.split(":")[1]);
    }
    const index = map.get(id);
    await fhIndex.close();
    return index;
  } catch (error) {
    console.log(error);
  }
};

export const getUser = async (index, id, pathUsers) => {
  try {
    if (!index) {
      return;
    }
    const fhUsers = await open(pathUsers);
    const buf = Buffer.alloc(31);
    await fhUsers.read(buf, 0, 31, Number(index) * 32);
    const userData = buf.toString("utf-8");
    const user = userData.replace(/\0[\s\S]*$/g, "").split("|");
    if (user[0] !== id) {
      await fhUsers.close();
      return;
    }
    await fhUsers.close();
    return user;
  } catch (error) {
    console.log(error);
  }
};
