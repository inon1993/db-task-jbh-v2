import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { getAction } from "./utils/utils.js";
import { addUser, getId, handleQuery } from "./utils/mainFunctions.js";

const rl = createInterface({ input, output });

const main = async () => {
  let action = "";
  while (action !== "E") {
    action = await getAction(rl);
    if (action === "A") {
      await addUser(rl);
    } else if (action === "S") {
      await getId(rl);
    } else if (action === "Q") {
      await handleQuery(rl);
    } else if (action === "E") {
      console.log("Bye-Bye!");
      rl.close();
    }
  }
};

await main();
