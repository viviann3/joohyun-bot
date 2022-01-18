const db = require("mongoose");
const cs = require("../models/currency");
const inv = require('../models/inventory');
const event = new(require('events').EventEmitter)();
let wallet;
let bank;
let maxBank;
let maxWallet;
let workCooldown = 0;


// ===================================================================
function setDefaultWalletAmount(amount) {
    if (parseInt(amount)) wallet = amount || 0;
}
// ===================================================================
function setDefaultBankAmount(amount) {
    if (parseInt(amount)) bank = amount || 0;
}
// ===================================================================
function setMaxBankAmount(amount) {
    if (parseInt(amount)) maxBank = amount || 0;
}
// ===================================================================
function setMaxWalletAmount(amount) {
    if (parseInt(amount)) maxWallet = amount || 0;
}
// ===================================================================
function connect(that, toLog = true) {
    let connected = true;
    db.connect(that, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).catch(e => {
        connected = false;
        throw new TypeError(`${e}`);
    }).then(() => {
        if (connected && toLog) console.info("Connected to DB successfully.");
    });
};
// ===================================================================
function amount(data, type = 'add', where = 'wallet', amount, by) {
    if (!data.bankSpace) data.bankSpace = maxBank || 0;

    if (where === 'bank') {
        if (type === 'add') data.bank += amount;
        else data.bank -= amount;
    } else {
        if (type === 'add') data.wallet += amount;
        else data.wallet -= amount;
    };
    if (data.bankSpace > 0 && data.bank > data.bankSpace) {
        const a = data.bank;
        data.bank = data.bankSpace;
        data.wallet += Math.abs(a - data.bankSpace);
    }
    if (!data.networth) data.networth = 0;
    data.networth = data.bank + data.wallet;
    try {
        event.emit('balanceUpdate', data, by.split(' ').map(w => w[0].toUpperCase() + w.substr(1).toLowerCase()).join(' '))
    } catch (E) {};
    return data;
};
// ===================================================================
async function setBankSpace(userID, guildID, newAmount) {
    let data = await findUser({}, userID, guildID, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')))
    const oldData = data;
    newAmount = parseInt(newAmount);
    if (!newAmount && newAmount !== 0) return {
        error: true,
        type: 'no-amount-provided',
        rawData: data
    };
    data.bankSpace = newAmount

    await saveUser(data);
    event.emit('userUpdate', oldData, data);
    if (oldData.bankSpace !== data.bankSpace) return {
        error: false,
        type: 'success',
        amount: data.bankSpace,
        rawData: data
    };
    else return {
        error: true,
        type: 'same-amount',
        rawData: data
    }
}
// ===================================================================
async function gamble(settings) {
    let data = await findUser(settings, null, null, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')))
    const oldData = data;
    const money = parseInt(settings.amount);
    const result = Math.floor(Math.random() * 10);
    const balance = data.wallet;
    let lastGamble = data.lastGamble;
    let cooldown = settings.cooldown || 50;
    if (!money) return {
        error: true,
        type: 'amount'
    };
    if (isNaN(money)) return {
        error: true,
        type: 'nan'
    };
    if (money > balance || !balance || balance === 0) return {
        error: true,
        type: 'low-money',
        neededMoney: Math.abs(balance - money)
    };
    if (money < settings.minAmount || 0) return {
        error: true,
        type: 'gamble-limit',
        minAmount: settings.minAmount || 0
    };
    if (lastGamble !== null && cooldown - (Date.now() - lastGamble) / 1000 > 0) return {
        error: true,
        type: 'time',
        second: parseSeconds(Math.floor(cooldown - (Date.now() - lastGamble) / 1000))
    };

    if (result <= 5) {
        data.lastGamble = Date.now();
        data = amount(data, 'remove', 'wallet', money, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')))
        await saveUser(data);
        return {
            error: false,
            type: 'lost',
            amount: money,
            wallet: data.wallet
        };
    } else if (result > 5) {
        data.lastGamble = Date.now();

        data = amount(data, 'add', 'wallet', money, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));

        await saveUser(data);
        event.emit('userUpdate', oldData, data);
        return {
            error: false,
            type: 'won',
            amount: money,
            wallet: data.wallet
        };
    };
};
// ===================================================================
async function withdraw(settings) {
    let data = await findUser(settings, null, null, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')))
    const oldData = data;
    let money = String(settings.amount);

    if (!money) return {
        error: true,
        type: 'money'
    };
    if (money.includes('-')) return {
        error: true,
        type: 'negative-money'
    };


    if (money === 'all' || money === 'max') {
        if (data.bank < 1) return {
            error: true,
            type: 'no-money'
        };
        data.wallet += data.bank;
        data.bank = 0;
        if (!data.networth) data.networth = 0;
        data.networth = data.bank + data.wallet;
        event.emit('userUpdate', oldData, data);
        await saveUser(data);
        return {
            error: false,
            rawData: data,
            type: 'all-success'
        }

    } else {
        money = parseInt(money);
        if (data.bank < parseInt(money)) return {
            error: true,
            type: 'low-money'
        };
        if (isNaN(money)) return {
            error: true,
            type: 'money'
        }

        if (money > data.bank) return {
            error: true,
            type: 'low-money'
        };


        data.wallet += money
        data.bank -= money

        await saveUser(data);
        event.emit('userUpdate', oldData, data);
        return {
            error: false,
            type: 'success',
            amount: money,
            rawData: data
        };
    }
};
// ===================================================================
async function deposite(settings) {
    let data = await findUser(settings, null, null, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
    const oldData = data;
    let money = String(settings.amount);

    if (!money) return {
        error: true,
        type: 'money'
    };
    if (String(money).includes('-')) return {
        error: true,
        type: 'negative-money'
    };


    if (money === 'all' || money === 'max') {

        if (wallet === 0) return {
            error: true,
            type: 'no-money'
        };
        data.bank += data.wallet;
        data.wallet = 0;

        if (data.bankSpace > 0 && data.bank > data.bankSpace) {
            const a = data.bank;
            data.bank = data.bankSpace;
            data.wallet += Math.abs(a - data.bankSpace);
        }


        if (!data.networth) data.networth = 0;
        data.networth = data.bank + data.wallet;
        await saveUser(data);
        event.emit('userUpdate', oldData, data);
        return {
            error: false,
            rawData: data,
            type: 'all-success'
        };


    } else {
        money = parseInt(money);
        if (!money) return {
            error: true,
            type: 'money'
        }
        if (money > data.wallet) return {
            error: true,
            type: 'low-money'
        };
        if ((data.bankSpace > 0) && (data.bank == data.bankSpace)) return {
            error: true,
            type: 'bank-full',
            rawData: data
        };

        data.bank += money;

        if ((data.wallet - money) < 0) {
            const a = data.wallet;
            data.wallet = 0;
            data.bank -= Math.abs(a - money);
        }

        data.wallet -= money;

        if (!data.networth) data.networth = 0;
        data.networth = data.bank + data.wallet;

        if (data.bankSpace > 0 && data.bank > data.bankSpace) {
            const a = data.bank;
            data.bank = data.bankSpace;
            data.wallet += Math.abs(a - data.bankSpace);
        }

        await saveUser(data);
        event.emit('userUpdate', oldData, data);
        return {
            error: false,
            rawData: data,
            type: 'success',
            amount: money
        };

    }
};
// ===================================================================
async function balance(settings) {
    let data = await findUser(settings, null, null, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')))
    if (!data.networth) data.networth = 0;
    data.networth = data.wallet + data.bank;
    return {
        rawData: data,
        bank: data.bank,
        wallet: data.wallet,
        networth: data.networth
    }
};
// ===================================================================
async function leaderboard(guildid) {
    let data = await cs.find({
        guildID: guildid || null
    });
    data.sort((a, b) => {
        return b.networth - a.networth
    })
    return data;
};
// ===================================================================
async function globalLeaderboard() {

    let array = await cs.find();
    var output = [];
    array.forEach(function (item) {
        var existing = output.filter(function (v, i) {
            return v.userID == item.userID;
        });
        if (existing.length) {
            var existingIndex = output.indexOf(existing[0]);
            output[existingIndex].bank = output[existingIndex].bank + item.bank
            output[existingIndex].wallet = output[existingIndex].wallet + item.wallet
        } else {
            output.push(item);
        }
    });
    output.sort((a, b) => {
        return b.networth - a.networth
    })
    return output;
};
// ===================================================================
async function work(settings) {
    let data = await findUser(settings, null, null, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')))
    const oldData = data;
    let lastWork = data.lastWork;
    let timeout = settings.cooldown;
    workCooldown = timeout;
    if (lastWork !== null && timeout - (Date.now() - lastWork) / 1000 > 0) return {
        error: true,
        type: 'time',
        time: parseSeconds(Math.floor(timeout - (Date.now() - lastWork) / 1000))
    };
    else {

        let amountt = Math.floor(Math.random() * settings.maxAmount || 100) + 1;
        data.lastWork = Date.now();
        data = amount(data, 'add', 'wallet', amountt, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
        await saveUser(data);
        event.emit('userUpdate', oldData, data);
        let result = Math.floor((Math.random() * settings.replies.length));
        return {
            error: false,
            type: 'success',
            workType: settings.replies[result],
            amount: amountt
        };

    };
};
// ===================================================================
async function monthly(settings) {
    let data = await findUser(settings, null, null, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')))
    const oldData = data;
    let monthly = data.lastMonthly;
    let timeout = 2.592e+6;
    if (monthly !== null && timeout - (Date.now() - monthly) / 1000 > 0) return {
        error: true,
        type: 'time',
        time: parseSeconds(Math.floor(timeout - (Date.now() - monthly) / 1000))
    };
    else {
        data.lastMonthly = Date.now();
        data = amount(data, 'add', 'wallet', settings.amount, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
        if ((Date.now() - monthly) / 1000 > timeout * 2) data.streak.monthly = 1;
        else data.streak.monthly += 1;
        await saveUser(data);
        event.emit('userUpdate', oldData, data);
        return {
            error: false,
            type: 'success',
            amount: settings.amount,
            rawData: data
        };

    };
};
// ===================================================================
async function yearly(settings) {
    let data = await findUser(settings, null, null, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')))
    const oldData = data;
    let yearly = data.lastYearly;
    let timeout = 3.156e+10;
    if (yearly !== null && timeout - (Date.now() - yearly) / 1000 > 0) return {
        error: true,
        type: 'time',
        time: parseSeconds(Math.floor(timeout - (Date.now() - yearly) / 1000))
    };
    else {
        data.lastYearly = Date.now();
        data = amount(data, 'add', 'wallet', settings.amount, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
        if ((Date.now() - lastYearly) / 1000 > timeout * 2) data.streak.yearly = 1;
        else data.streak.yearly += 1;
        await saveUser(data);
        event.emit('userUpdate', oldData, data);
        return {
            error: false,
            type: 'success',
            amount: settings.amount,
            rawData: data
        };

    };
};
// ===================================================================
async function weekly(settings) {
    let data = await findUser(settings, null, null, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')))
    const oldData = data;
    let weekly = data.lastWeekly;
    let timeout = 604800;
    if (weekly !== null && timeout - (Date.now() - weekly) / 1000 > 0) return {
        error: true,
        type: 'time',
        time: parseSeconds(Math.floor(timeout - (Date.now() - weekly) / 1000))
    };
    else {
        data.lastWeekly = Date.now();
        data = amount(data, 'add', 'wallet', settings.amount, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
        if ((Date.now() - data.lastWeekly) / 1000 > timeout * 2) data.streak.weekly = 1;
        else data.streak.weekly += 1;
        await saveUser(data);
        event.emit('userUpdate', oldData, data);
        return {
            error: false,
            type: 'success',
            amount: settings.amount,
            rawData: data
        };

    };
};
// ===================================================================
async function quaterly(settings) {
    let data = await findUser(settings, null, null, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')))
    const oldData = data;
    let quaterly = data.lastQuaterly;
    let timeout = 21600;
    if (quaterly !== null && timeout - (Date.now() - quaterly) / 1000 > 0) return {
        error: true,
        type: 'time',
        time: parseSeconds(Math.floor(timeout - (Date.now() - quaterly) / 1000))
    };
    else {
        data.lastQuaterly = Date.now();
        data = amount(data, 'add', 'wallet', settings.amount, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
        if ((Date.now() - quaterly) / 1000 > timeout * 2) data.streak.quaterly = 1;
        else data.streak.quaterly += 1;
        await saveUser(data);
        event.emit('userUpdate', oldData, data);
        return {
            error: false,
            type: 'success',
            amount: settings.amount,
            rawData: data
        };

    };
};
// ===================================================================
async function hafly(settings) {
    let data = await findUser(settings, null, null, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')))
    const oldData = data;
    let hafly = data.lastHafly;
    let timeout = 43200;
    if (hafly !== null && timeout - (Date.now() - hafly) / 1000 > 0) return {
        error: true,
        type: 'time',
        time: parseSeconds(Math.floor(timeout - (Date.now() - hafly) / 1000))
    };
    else {
        data.lastHafly = Date.now();
        data = amount(data, 'add', 'wallet', settings.amount, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
        if ((Date.now() - lastHafly) / 1000 > timeout * 2) data.streak.hafly = 1;
        else data.streak.hafly += 1;
        await saveUser(data);
        event.emit('userUpdate', oldData, data);
        return {
            error: false,
            type: 'success',
            amount: settings.amount,
            rawData: data
        };
    };
};
// ===================================================================
async function daily(settings) {
    let data = await findUser(settings, null, null, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')))
    const oldData = data;
    let daily = data.lastDaily;
    let timeout = 86400;
    if (daily !== null && timeout - (Date.now() - daily) / 1000 > 0) return {
        error: true,
        type: 'time',
        time: parseSeconds(Math.floor(timeout - (Date.now() - daily) / 1000))
    };
    else {
        data.lastDaily = Date.now();
        data = amount(data, 'add', 'wallet', settings.amount, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
        if ((Date.now() - daily) / 1000 > timeout * 2) data.streak.daily = 1;
        else data.streak.daily += 1;
        await saveUser(data);
        event.emit('userUpdate', oldData, data);
        return {
            error: false,
            type: 'success',
            amount: settings.amount,
            rawData: data
        };

    };
};
// ===================================================================
async function hourly(settings) {
    let data = await findUser(settings, null, null, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')))
    const oldData = data;
    let lastHourly = data.lastHourly;
    let timeout = 3600;

    if (lastHourly !== null && timeout - (Date.now() - lastHourly) / 1000 > 0) return {
        error: true,
        type: 'time',
        time: parseSeconds(Math.floor(timeout - (Date.now() - lastHourly) / 1000))
    };
    else {
        data.lastHourly = Date.now();
        data = amount(data, 'add', 'wallet', settings.amount, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
        if ((Date.now() - lastHourly) / 1000 > timeout * 2) data.streak.hourly = 1;
        else data.streak.hourly += 1;
        await saveUser(data);
        event.emit('userUpdate', oldData, data);
        return {
            error: false,
            type: 'success',
            amount: settings.amount,
            rawData: data
        };

    };
};
// ===================================================================
async function rob(settings) {
    if (typeof settings.guild === 'string') settings.guild.id = settings.guild;
    if (typeof settings.user === 'string') settings.user.id = settings.user;
    if (!settings.guild) settings.guild = {
        id: null
    }
    let user1 = await findUser(settings, null, null, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')))
    const oldData = user1;
    let user2 = await cs.findOne({
        userID: settings.user2.id,
        guildID: settings.guild.id || null
    });
    if (!user2) user2 = await makeUser(settings, true)
    const oldData2 = user2;
    let lastRob = user1.lastRob;
    let timeout = settings.cooldown;

    if (lastRob !== null && timeout - (Date.now() - lastRob) / 1000 > 0) return {
        error: true,
        type: 'time',
        time: parseSeconds(Math.floor(timeout - (Date.now() - lastRob) / 1000))
    };

    if (user1.wallet < (settings.minAmount - 2)) return {
        error: true,
        type: 'low-money',
        minAmount: settings.minAmount
    };
    if (user2.wallet < (settings.minAmount - 2)) return {
        error: true,
        type: 'low-wallet',
        user2: settings.user2,
        minAmount: settings.minAmount
    };
    let max = settings.maxRob;
    if (!max || max < 1000) max = 1000
    let random = Math.floor(Math.random() * (Math.floor(max || 1000) - 99)) + 99
    if (random > user2.wallet) random = user2.wallet;
    user1.lastRob = Date.now();
    // 5 here is percentage of success.
    if (testChance(settings.successPercentage || 5)) {
        // Success!
        user2 = amount(user2, 'remove', 'wallet', random, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
        user1 = amount(user1, 'add', 'wallet', random, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));

        await saveUser(user1, user2);
        event.emit('userUpdate', oldData, user1, oldData2, user2);
        return {
            error: false,
            type: 'success',
            user2: settings.user2,
            minAmount: settings.minAmount,
            amount: random
        };

    } else {
        // Fail :(
        if (random > user1.wallet) random = user1.wallet;
        user2 = amount(user2, 'add', 'wallet', random, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
        user1 = amount(user1, 'remove', 'wallet', random, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
        await saveUser(user1, user2);
        event.emit('userUpdate', oldData, user1, oldData2, user2);
        return {
            error: true,
            type: 'caught',
            user2: settings.user2,
            minAmount: settings.minAmount,
            amount: random
        };
    };

};
// ===================================================================
async function beg(settings) {
    let data = await findUser(settings, null, null, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')))
    const oldData = data;
    let beg = data.lastBegged; // XDDDD
    let timeout = 240;
    if (parseInt(settings.cooldown)) timeout = parseInt(settings.cooldown);
    if (beg !== null && timeout - (Date.now() - beg) / 1000 > 0) return {
        error: true,
        type: 'time',
        time: parseSeconds(Math.floor(timeout - (Date.now() - beg) / 1000))
    };
    else {
        const amountt = Math.round((settings.minAmount || 200) + Math.random() * (settings.maxAmount || 400));
        data.lastBegged = Date.now();
        data = amount(data, 'add', 'wallet', amountt, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
        await saveUser(data);
        event.emit('userUpdate', oldData, data);

        return {
            error: false,
            type: 'success',
            amount: amountt
        };

    };
};
// ===================================================================
async function addMoneyToAllUsers(settings) {
    if (String(settings.amount).includes("-")) return {
        error: true,
        type: 'negative-money'
    };
    let amountt = parseInt(settings.amount) || 0;

    if (typeof settings.guild === 'string') settings.guild = {
        id: settings.guild
    };
    if (!settings.guild) settings.guild = {
        id: null
    };
    let data = await cs.find({
        guildID: settings.guild.id || null
    });
    if (!data) return {
        error: true,
        type: 'no-users'
    }
    const oldData = data;
    data.forEach(async (user) => {
        if (settings.wheretoPutMoney === "bank") user = amount(user, 'add', 'bank', amountt, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
        else user = amount(user, 'add', 'wallet', amountt, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
    });
    event.emit('usersUpdate', oldData, data);

    data.forEach(a => a.save(function (err, saved) {
        if (err) console.log(err);
    }));

    return {
        error: false,
        type: 'success',
        rawData: data
    };
};
// ===================================================================
async function addMoney(settings) {
    let data = await findUser(settings, null, null, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
    const oldData = data;
    if (String(settings.amount).includes("-")) return {
        error: true,
        type: 'negative-money'
    };
    let amountt = parseInt(settings.amount) || 0;
    if (settings.wheretoPutMoney === "bank") data = amount(data, 'add', 'bank', amountt, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
    else data = amount(data, 'add', 'wallet', amountt, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));

    event.emit('userUpdate', oldData, data);
    await saveUser(data);
    return {
        error: false,
        type: 'success',
        rawData: data
    };
};
// ===================================================================
async function removeMoneyFromAllUsers(settings) {
    if (String(settings.amount).includes("-")) return {
        error: true,
        type: 'negative-money'
    };
    let amountt = parseInt(settings.amount) || 0;

    if (typeof settings.guild === 'string') settings.guild = {
        id: settings.guild
    };
    if (!settings.guild) settings.guild = {
        id: null
    };
    let data = await cs.find({
        guildID: settings.guild.id || null
    });
    if (!data) return {
        error: true,
        type: 'no-users'
    }
    const oldData = data;

    data.forEach(async (user) => {
        if (settings.wheretoPutMoney === "bank") {
            if (settings.amount === 'all' || settings.amount === "max") user.bank = 0;
            else user = amount(user, 'remove', 'bank', parseInt(settings.amount) || 0, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
        } else {
            if (settings.amount === 'all' || settings.amount === "max") user.wallet = 0;
            else user = amount(user, 'remove', 'wallet', parseInt(settings.amount) || 0, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
        }
    });
    event.emit('usersUpdate', oldData, data);
    data.forEach(a => a.save(function (err, saved) {
        if (err) console.log(err);
    }));

    return {
        error: false,
        type: 'success',
        rawData: data
    };
};
// ===================================================================
async function removeMoney(settings) {
    let data = await findUser(settings, null, null, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
    const oldData = data;
    if (String(settings.amount).includes("-")) return {
        error: true,
        type: 'negative-money'
    };
    if (settings.wheretoPutMoney === "bank") {
        if (settings.amount === 'all' || settings.amount === "max") data.bank = 0;
        else data = amount(data, 'remove', 'bank', parseInt(settings.amount) || 0, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
    } else {
        if (settings.amount === 'all' || settings.amount === "max") data.wallet = 0;
        else data = amount(data, 'remove', 'wallet', parseInt(settings.amount) || 0, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
    }

    await saveUser(data);
    event.emit('userUpdate', oldData, data);

    return {
        error: false,
        type: 'success',
        rawData: data
    };
};
// ===================================================================
async function info(userID, guildID) {
    let data = await findUser({}, userID, guildID, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')))

    let lastHourlyy = true;
    let lastHaflyy = true;
    let lastDailyy = true;
    let lastWeeklyy = true;
    let lastMonthlyy = true;
    let lastBeggedy = true;
    let lastQuaterlyy = true;
    let lastWorkk = true;
    if (data.lastBegged !== null && 240 - (Date.now() - data.lastBegged) / 1000 > 0) lastBeggedy = false;
    if (data.lastHourly !== null && 3600 - (Date.now() - data.lastHourly) / 1000 > 0) lastHourlyy = false;
    if (data.lastDaily !== null && 86400 - (Date.now() - data.lastDaily) / 1000 > 0) lastDailyy = false;
    if (data.lastHafly !== null && 43200 - (Date.now() - data.lastHafly) / 1000 > 0) lastHaflyy = false;
    if (data.lastQuaterly !== null && 12600 - (Date.now() - data.lastQuaterly) / 1000 > 0) lastQuaterlyy = false;
    if (data.lastWeekly !== null && 604800 - (Date.now() - data.lastWeekly) / 1000 > 0) lastWeeklyy = false;
    if (data.lastMonthly !== null && 2.592e+6 - (Date.now() - data.lastMonthly) / 1000 > 0) lastMonthlyy = false;
    if (data.lastWork !== null && workCooldown - (Date.now() - data.lastWork) / 1000 > 0) lastWorkk = false;
    return {
        error: false,
        rawData: data,
        info: Object.entries({
            Hourly: {
                used: lastHourlyy,
                timeLeft: parseSeconds(Math.floor(3600 - (Date.now() - data.lastHourly) / 1000))
            },
            Hafly: {
                used: lastHaflyy,
                timeLeft: parseSeconds(Math.floor(43200 - (Date.now() - data.lastHafly) / 1000))
            },
            Daily: {
                used: lastDailyy,
                timeLeft: parseSeconds(Math.floor(86400 - (Date.now() - data.lastDaily) / 1000))
            },
            Weekly: {
                used: lastWeeklyy,
                timeLeft: parseSeconds(Math.floor(604800 - (Date.now() - data.lastWeekly) / 1000))
            },
            Monthly: {
                used: lastMonthlyy,
                timeLeft: parseSeconds(Math.floor(2.592e+6 - (Date.now() - data.lastMonthly) / 1000))
            },
            Begged: {
                used: lastBeggedy,
                timeLeft: parseSeconds(Math.floor(240 - (Date.now() - data.lastBegged) / 1000))
            },
            Quaterly: {
                used: lastQuaterlyy,
                timeLeft: parseSeconds(Math.floor(12600 - (Date.now() - data.lastQuaterly) / 1000))
            },
            Work: {
                used: lastWorkk,
                timeLeft: parseSeconds(Math.floor(12600 - (Date.now() - data.lastWork) / 1000))
            }
        })
    }
}
// ===================================================================
async function transferMoney(settings) {
    if (typeof settings.user === 'string') settings.user = {
        id: settings.user
    }
    if (typeof settings.guild === 'string') settings.guild = {
        id: settings.guild
    }
    if (!settings.guild) settings.guild = {
        id: null
    }
    let user1 = await findUser(settings, null, null, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')))
    const oldData = user1;
    let user2 = await cs.findOne({
        userID: settings.user2.id,
        guildID: settings.guild.id || null
    });
    if (!user2) user2 = await makeUser(settings, true);
    const oldData1 = user2;
    let money = parseInt(settings.amount)
    if (user1.wallet < money) return {
        error: true,
        type: 'low-money'
    };
    user1 = amount(user1, 'remove', 'wallet', money, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));
    user2 = amount(user2, 'add', 'wallet', money, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')));

    await saveUser(user1, user2);
    event.emit('userUpdate', oldData, user1, oldData1, user2);

    return {
        error: false,
        type: 'success',
        money: money,
        user: settings.user,
        user2: settings.user2,
        rawData: user1,
        rawData1: user2
    };
};
// ===================================================================
async function getUserItems(settings) {
    let data = await findUser(settings, null, null, arguments.callee.toString().substring(15, arguments.callee.toString().indexOf('(')))
    return {
        error: false,
        inventory: data.inventory,
        rawData: data
    };
};
// ===================================================================
async function getShopItems(settings) {
    let data = await getInventory(settings);
    return {
        error: false,
        inventory: data.inventory,
        rawData: data
    };
};

// ===================================================================
function parseSeconds(seconds) {
    if (String(seconds).includes('-')) return '0 Seconds'
    let days = parseInt(seconds / 86400);
    seconds = seconds % 86400;
    let hours = parseInt(seconds / 3600);
    seconds = seconds % 3600;
    let minutes = parseInt(seconds / 60);
    seconds = parseInt(seconds % 60);

    if (days) {
        return `${days} days, ${hours} hours, ${minutes} minutes`
    } else if (hours) {
        return `${hours} hours, ${minutes} minutes, ${seconds} seconds`
    } else if (minutes) {
        return `${minutes} minutes, ${seconds} seconds`
    }

    return `${seconds} second(s)`
};
// ===================================================================
// This is for Rob Command
function testChance(successPercentage) {
    let random2 = Math.random() * 10;
    return ((random2 -= successPercentage) < 0);
};
// Basic Functions
// ===================================================================
async function findUser(settings, uid, gid, by) {
    if (typeof settings.user === 'string') settings.user = {
        id: settings.user
    }
    if (typeof settings.guild === 'string') settings.guild = {
        id: settings.guild
    }

    if (!settings.guild) settings.guild = {
        id: null
    }
    let find = await cs.findOne({
        userID: uid || settings.user.id,
        guildID: gid || settings.guild.id || null
    });
    if (!find) find = await makeUser(settings, false, uid, gid)

    if (maxBank > 0 && find.bankSpace == 0) find.bankSpace = maxBank;
    if (!find.streak) find.streak = {};
    if (!find.streak.hourly) find.streak.hourly = 1;
    if (!find.streak.daily) find.streak.daily = 1;
    if (!find.streak.weekly) find.streak.weekly = 1;
    if (!find.streak.monthly) find.streak.monthly = 1;
    if (!find.streak.yearly) find.streak.yearly = 1;
    if (!find.streak.hafly) find.streak.hafly = 1;
    if (!find.streak.quaterly) find.streak.quaterly = 1;
    try {
        event.emit('userFetch', find, by.split(' ').map(w => w[0].toUpperCase() + w.substr(1).toLowerCase()).join(' '));
    } catch (e) {}
    return find;
};
// ===================================================================
async function getInventory(settings) {
    if (typeof settings.user === 'string') settings.user = {
        id: settings.user
    }
    if (typeof settings.guild === 'string') settings.guild = {
        id: settings.guild
    }
    if (!settings.guild) settings.guild = {
        id: null
    }
    let find = await inv.findOne({
        guildID: settings.guild.id || null
    });
    if (!find) find = await makeInventory(settings);
    if (find.inventory.length > 0) find.inventory.forEach(a => {
        if (!a.description) a.description = 'No Description.';
    });
    event.emit('guildInventoryFetch', find)
    return find;
};
// ===================================================================
async function makeInventory(settings) {
    if (typeof settings.user === 'string') settings.user = {
        id: settings.user
    }
    if (typeof settings.guild === 'string') settings.guild = {
        id: settings.guild
    }
    if (!settings.guild) settings.guild = {
        id: null
    }
    const inventory = new inv({
        guildID: settings.guild.id || null,
        inventory: []
    });
    // await saveUser(inventory);
    event.emit('guildInventoryCreate', inventory);
    return inventory;
};
// ===================================================================
async function makeUser(settings, user2 = false, uid, gid) {
    if (typeof settings.user === 'string') settings.user = {
        id: settings.user
    }
    if (typeof settings.guild === 'string') settings.guild = {
        id: settings.guild
    }
    if (!settings.guild) settings.guild = {
        id: null
    }
    let user = uid || settings.user.id
    if (user2) user = settings.user2.id;
    const newUser = new cs({
        userID: user,
        guildID: gid || settings.guild.id || null,
        wallet: wallet || 0,
        bank: bank || 0,
        bankSpace: maxBank || 0,
        streak: {
            hourly: 1,
            daily: 1,
            weekly: 1,
            monthly: 1,
            yearly: 1,
            hafly: 1,
            quaterly: 1,
        }
    });
    if (!newUser) throw new Error('Missing data to fetch from DB. (A function in Currency System is used and userID wasn\'t provided.)')
    // await saveUser(newUser);
    event.emit('userCreate', newUser);
    return newUser;

};
// ===================================================================
async function saveUser(data, data2) {
    // this will prevent error
    // ParallelSaveError: Can't save() the same doc multiple times in parallel.
    // await sleep(Math.floor((Math.random() * 10) + 1) * 100) // 100 - 1000 random  Number generator
    // await data.save(function (err) {
    //     if (err) throw err;
    // });
    // if (data2) {
    //     await sleep(Math.floor((Math.random() * 10) + 1) * 100) // 100 - 1000 random  Number generator
    //     await data2.save(function (err) {
    //         if (err) throw err;
    //     });
    // }
    process.nextTick(async () => {
        await sleep(Math.floor((Math.random() * 10) + 1) * 100) // 100 - 1000 random  Number generator
        data.save(_ => _ ? console.error(`ERROR Occured while saving data (Currency-system) \n${'='.repeat(50)}\n${_+'\n'+'='.repeat(50)}`) : 'No Error');
        if (data2) data2.save(_ => _ ? console.error(`ERROR Occured while saving data (Currency-system) \n${'='.repeat(50)}\n${_+'\n'+'='.repeat(50)}`) : 'No Error');
    }, data, data2);

};

// ===================================================================
function updateInventory(mongoURL, newData, settings, collection = "inventory-currencies") {
    event.emit('debug', `[ CS => Debug ] : UpdateInventory function is executed.`)
    if (typeof settings.user === 'string') settings.user = {
        id: settings.user
    }
    if (typeof settings.guild === 'string') settings.guild = {
        id: settings.guild
    }
    if (!settings.guild) settings.guild = {
        id: null
    };
    let query = {
        guildID: settings.guild.id || null,
    };
    if (settings.user) query = {
        userID: settings.user.id,
        guildID: settings.guild.id || null,
    }
    new(require('mongodb').MongoClient)(mongoURL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).connect(function (err, db) {
        if (err) return event.emit('debug', `[ CS => Error ] : Unable To Connect to MongoDB ( updateInventory Function )`, err)

        event.emit('debug', `[ CS => Debug ] : Connected to MongoDB ( updateInventory Function )`);
        db.db(mongoURL.split('/')[mongoURL.split('/').length - 1]).collection(collection).updateOne(query, {
            $set: {
                inventory: newData
            }
        }, {
            upsert: true
        }, function (err, res) {
            if (err) return event.emit('debug', `[ CS => Error ] : Unable To Save Data to MongoDB ( updateInventory Function )`, err)
            if (res.result.n) event.emit('debug', `[ CS => Debug ] : Successfully Saved Data ( updateInventory Function )`);
            else event.emit('debug', `[ CS => Error ] : MongoDB Didn't Update the DB. ( updateInventory Function )`);
            db.close();
            event.emit('debug', `[ CS => Debug ] : Closing DB  ( updateInventory Function )`)
        });
    });
};

// ===================================================================
function sleep(milliseconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
};

// ===================================================================
function searchForNewUpdate(state = true) {
    if (state) _checkUpdate();
}
// ===================================================================
// colors : https://github.com/shiena/ansicolor/blob/master/README.md
async function _checkUpdate() {
    if (!require('node-fetch')) return;
    const packageData = await require('node-fetch')(`https://registry.npmjs.com/currency-system`).then(text => text.json())
    if (require('../../package.json').version !== packageData['dist-tags'].latest) {
        console.log('\n\n')
        console.log('\x1b[32m' + '---------------------------------------------------')
        console.log('\x1b[32m' + '| @ currency-system                        - [] X |')
        console.log('\x1b[32m' + '---------------------------------------------------')
        console.log('\x1b[33m' + `|            The module is\x1b[31m out of date!\x1b[33m           |`)
        console.log('\x1b[35m' + '|             New version is available!           |')
        console.log('\x1b[34m' + `|                ${require('../../package.json').version} --> ${packageData['dist-tags'].latest}                |`)
        console.log('\x1b[36m' + '|        Run "npm i currency-system@latest"       |')
        console.log('\x1b[36m' + '|                    to update!                   |')
        console.log('\x1b[37m' + `|          View the full changelog here:          |`)
        console.log('\x1b[31m' + '|         https://currency-system.js.org          |')
        console.log('\x1b[32m' + '---------------------------------------------------\x1b[37m')
        console.log('\n\n')

    }

}
// ===================================================================
module.exports = {
    setDefaultWalletAmount,
    setDefaultBankAmount,
    connect,
    gamble,
    withdraw,
    deposite,
    balance,
    leaderboard,
    globalLeaderboard,
    work,
    monthly,
    yearly,
    weekly,
    quaterly,
    hafly,
    daily,
    hourly,
    rob,
    beg,
    addMoney,
    removeMoney,
    transferMoney,
    getUserItems,
    getShopItems,
    findUser,
    makeUser,
    saveUser,
    getInventory,
    makeInventory,
    updateInventory,
    sleep,
    info,
    setMaxBankAmount,
    setMaxWalletAmount,
    setBankSpace,
    searchForNewUpdate,
    addMoneyToAllUsers,
    removeMoneyFromAllUsers
}
module.exports.cs = event;