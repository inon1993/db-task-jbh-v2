import { open } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  getAction,
  getIndex,
  getUserInfo,
  getUserIndex,
  getUser,
} from "./utils.js";

const rl = createInterface({ input, output });
const pathUsers = "./db.txt";
const pathIndex = "./index.txt";

const addUser = async () => {
  try {
    const fhUsers = await open(pathUsers, "a+");
    const fhIndex = await open(pathIndex, "a+");
    const user = await getUserInfo(rl, pathIndex);
    const str = `${user.id}|${user.fname}|${user.lname}`;
    const b = Buffer.alloc(31);
    b.write(str, "utf-8");
    await fhUsers.appendFile(b);
    await fhUsers.appendFile("\n");
    const index = await getIndex();
    await fhIndex.appendFile(`${user.id}:${index}\n`);
    await fhUsers.close();
    await fhIndex.close();
    console.log("User was added.");
  } catch (error) {
    console.log(error);
  }
};

const searchUser = async () => {
  let id = "";
  let isValidId = false;
  while (!isValidId) {
    id = await rl.question("Enter an ID to search: ");
    const index = await getUserIndex(id, pathIndex);
    if (!index) {
      console.log("No user found.");
    } else {
      const user = await getUser(index, id, pathUsers);
      console.log(
        `ID: ${user[0]}\nFirstname: ${user[1]}\nLastname: ${user[2]}\n`
      );
      isValidId = true;
    }
  }
  rl.close();
  return;
};

const main = async () => {
  const action = await getAction(rl);
  if (action === "A") {
    await addUser();
  } else if (action === "S") {
    await searchUser();
  } else if (action === "E") {
    console.log("Bye-Bye!");
    rl.close();
  }
};

main();
