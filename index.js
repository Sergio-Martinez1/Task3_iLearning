const { argv } = require('node:process');
const { createHmac, randomBytes } = require('node:crypto');
const { Table } = require('console-table-printer');
const readline = require('node:readline');

async function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    rl.question(query, move => {
      rl.close();
      resolve(move);
    })
  })
}

async function main(menu) {
  let exit = false;

  while (!exit) {
    menu.printMenu();
    let move = await askQuestion("Enter your move:");
    exit = await menu.selectMenuOption(move);
  }
}



class HMACTool {
  createHmacKey(size) {
    const key = randomBytes(size).toString('hex');
    return key;
  }
  createHmac(message, key) {
    const hmac = createHmac('sha3-256', key);
    return hmac.update(message).digest('hex');
  }
}

class GameRule {
  constructor(moves) {
    this.moves = moves;
  }

  getResult(user_selection, computer_selection) {
    let a = computer_selection;
    let b = user_selection;
    let n = this.moves.length;
    let p = Math.floor(n / 2)
    let result = Math.sign((a - b + p + n) % n - p);
    if (result < 0) {
      return "lose";
    } else if (result == 0) {
      return "draw";
    } else {
      return "win";
    }
  }
}

class CliTable {
  constructor(moves) {
    this.moves = moves;
  }

  table;

  createTable() {
    let columns = [{ name: "v PC/User >", alignment: "left", color: "white" }];
    for (let i = 0; i < this.moves.length; i++) {
      columns.push({ name: `${this.moves[i]}`, alignment: "left", color: "magenta" });
    }
    this.table = new Table({ columns: columns });
    for (let i = 0; i < this.moves.length; i++) {
      let row = {};
      for (let j = 0; j < columns.length; j++) {
        if (j == 0) row[columns[j]['name']] = this.moves[i];
        else {
          let result = new GameRule(this.moves);
          row[columns[j]['name']] = result.getResult(j - 1, i);
        }
      }
      this.table.addRow(row)
    }
  }
  async printTable() {
    console.log("This table shows who wins in all the cases.\n")
    console.log("Example:")
    console.log(`-If you select ${moves[0]} and computer ${moves[0]}, it's a draw.`)
    console.log(`-If you select ${moves[0]} and computer ${moves[1]}, you win.\n`)
    this.table.printTable();
    console.log()
    await askQuestion("Press enter to return...");
  }
}

class Menu {
  constructor(moves, hmacKey, hmac, computer_selection) {
    this.moves = moves;
    this.hmacKey = hmacKey;
    this.hmac = hmac;
    this.computer_selection = computer_selection;
  }

  printMenu() {
    process.stdout.write('\x1Bc');
    console.log("Beat the computer to win!\n")
    console.log("How does it work?\n")
    console.log("Supose that there are 5 options.")
    console.log("If you choose 1, you will beat the front half (2 and 3), but you will lose against the back half (4 and 5).")
    console.log("If you choose 5, you will beat the front half (1 and 2), but you will lose against the back half (3 and 4).\n")
    console.log("HMAC:", this.hmac);
    console.log("\nAvailable moves:")
    this.moves.forEach((element, i) => {
      console.log(`${i + 1} - ${element}`);
    });
    console.log("0 - exit");
    console.log("? - help");
  }

  async selectMenuOption(optionIndex) {
    optionIndex = optionIndex.trim();
    if (optionIndex.length == 0) optionIndex = "null";
    if (Number(optionIndex) === 0) {
      process.stdout.write('\x1Bc');
      return true;
    }
    else if (optionIndex === "?") {
      let table = new CliTable(this.moves);
      table.createTable();
      process.stdout.write('\x1Bc');
      await table.printTable();
      process.stdout.write('\x1Bc');
    } else if (Number(optionIndex) <= (this.moves.length - 1) && Number(optionIndex) > 0) {
      let user_selection = Number(optionIndex) - 1;
      console.log('\nYour move:', this.moves[user_selection]);
      console.log('Computer move:', this.moves[this.computer_selection]);
      let rule = new GameRule(this.moves);
      console.log(`You ${rule.getResult(user_selection, this.computer_selection)}!`);
      console.log("\nHMAC key:", this.hmacKey);
      await askQuestion("\nPress enter to continue...");
    } else {
      console.log('\nPlease insert a valid option!')
      await askQuestion("\nPress enter to continue...");
    }
    return false;
  }
}

argv.splice(0, 2);
const moves = argv;
const computer_selection = Math.floor(Math.random() * moves.length);
const hmacTool = new HMACTool();
const key = hmacTool.createHmacKey(32);
const hmac = hmacTool.createHmac(moves[computer_selection], key);
let repeated = false;
moves.forEach((move, index) => {
  if (moves.indexOf(move) !== index) {
    repeated = true;
  }
})

if (moves.length < 3) {
  console.log("Please put more at least 3 options...")
} else if (moves.length % 2 == 0) {
  console.log("Please put an odd number of options...")
} else if (repeated) {
  console.log("Please don't repeat options...")
} else {
  const menu = new Menu(moves, key, hmac, computer_selection);
  main(menu);
}

