const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");

const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent]});
require('dotenv').config();

const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

let db;

async function initDatabase() {
    db = await sqlite.open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    await db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            job TEXT,
            jobIndex1 INTEGER,
            jobIndex2 INTEGER,
            money INTEGER,
            timesWorked INTEGER,
            timeSinceLastWork INTEGER,
            lastPassiveIncome INTEGER
        )
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS houses (
            userId TEXT,
            houseIndex INTEGER,
            PRIMARY KEY (userId, houseIndex)
        )
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS businesses (
            userId TEXT,
            businessIndex INTEGER,
            PRIMARY KEY (userId, businessIndex)
        )
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS illegal_businesses (
            userId TEXT,
            businessIndex INTEGER,
            PRIMARY KEY (userId, businessIndex)
        )
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            description TEXT,
            price INTEGER
        )
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS inventory (
            userId TEXT,
            itemId INTEGER,
            quantity INTEGER,
            PRIMARY KEY (userId, itemId),
            FOREIGN KEY (itemId) REFERENCES items(id)
        )
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS active_drugs (
            userId TEXT,
            drugId INTEGER,
            expiresAt INTEGER,
            PRIMARY KEY (userId, drugId),
            FOREIGN KEY (drugId) REFERENCES items(id)
        )
    `);

    console.log('✅ Database initialized');
}

async function getUser(id, name) {
    const user = await db.get('SELECT * FROM users WHERE id = ?', id);
    if (!user) {
        await db.run(
            'INSERT INTO users (id, name, job, jobIndex1, jobIndex2, money, timesWorked, timeSinceLastWork, lastPassiveIncome) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            id, name, 'None', 0, 0, 0, 0, 0, Date.now()
        );
        return {
            id,
            name,
            job: 'None',
            jobIndex: [0, 0],
            money: 0,
            timesWorked: 0,
            timeSinceLastWork: 0,
            lastPassiveIncome: Date.now()
        };
    }
    
    return {
        id: user.id,
        name: user.name,
        job: user.job,
        jobIndex: [user.jobIndex1, user.jobIndex2],
        money: user.money,
        timesWorked: user.timesWorked,
        timeSinceLastWork: user.timeSinceLastWork,
        lastPassiveIncome: user.lastPassiveIncome || Date.now()
    };
}

async function getUserWithId(id) {
    const user = await db.get('SELECT * FROM users WHERE id = ?', id);
    if (!user) {
        await db.run(
            'INSERT INTO users (id, name, job, jobIndex1, jobIndex2, money, timesWorked, timeSinceLastWork, lastPassiveIncome) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            id, "Unknown", 'None', 0, 0, 0, 0, 0, Date.now()
        );
        return {
            id,
            name: "Unknown",
            job: 'None',
            jobIndex: [0, 0],
            money: 0,
            timesWorked: 0,
            timeSinceLastWork: 0,
            lastPassiveIncome: Date.now()
        };
    }

    return {
        id: user.id,
        name: user.name,
        job: user.job,
        jobIndex: [user.jobIndex1, user.jobIndex2],
        money: user.money,
        timesWorked: user.timesWorked,
        timeSinceLastWork: user.timeSinceLastWork,
        lastPassiveIncome: user.lastPassiveIncome || Date.now()
    };
}

async function updateUser(user) {
    await db.run(
        'UPDATE users SET job = ?, jobIndex1 = ?, jobIndex2 = ?, money = ?, timesWorked = ?, timeSinceLastWork = ?, lastPassiveIncome = ? WHERE id = ?',
        user.job, user.jobIndex[0], user.jobIndex[1], user.money, user.timesWorked, user.timeSinceLastWork, user.lastPassiveIncome, user.id
    );
}

async function closeDatabase() {
    if (db) {
        await db.close();
        console.log('✅ Database closed');
    }
}

async function initDrugs() {
    for (const drug of DRUG_ITEMS) {
        await db.run(
            'INSERT OR IGNORE INTO items (name, description, price) VALUES (?, ?, ?)',
            drug.name, drug.description, drug.price
        )
    }
}

client.once("clientReady", async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    await initDatabase();
    await initDrugs();
});

const JOBS = [
    ['None'],
    ['Cashier', 'Stocker', 'Manager'],
    ['Burger Flipper', 'Assistant Manager', 'Manager'],
    ['Intern', 'Junior Developer', 'Senior Developer', 'Tech Lead'],
    ['Nurse', 'Doctor', 'Surgeon', 'Chief Surgeon'],
    ['Street Performer', 'Actor', 'Director', 'Producer']
];
const JOB_PAY = [
    [0],
    [10, 15, 20],
    [6, 14, 24],
    [5, 30, 60, 125],
    [10, 25, 50, 125],
    [5, 30, 50, 125]
];
const PROMOTION_REQUIREMENT = [
    [1000],
    [5, 8, 1000],         // 25
    [6, 4, 1000],         // 32
    [5, 20, 50, 1000],      // 75
    [10, 20, 50, 1000],     // 80
    [20, 15, 50, 1000]      // 85
];

const BUSINESS_NAMES = [
    "Food Truck",
    "Laundromat",
    "Gas Station",
    "Clothing Store",
    "Car Dealership",
    "Chain Supermarket"
];

const BUSINESS_PRICES = [
    100000,
    150000,
    225000,
    300000,
    500000,
    1000000
];

const BUSINESS_INCOME = [
    1100,
    1700,
    2400,
    3500,
    5600,
    11000
];

const HOUSE_NAMES = [
    "Studio Apartment",
    "Suite",
    "Bungalow",
    "Duplex",
    "Townhouse",
    "Mansion"
];

const HOUSE_PRICES = [
    1000,
    2000,
    5000,
    10000,
    20000,
    100000
];

const HOUSE_INCOME = [
    10,
    20,
    50,
    100,
    200,
    1000
];

const ILLEGAL_BUSINESS_NAMES = [
    'Weed Farm',
    'Cocaine Lockup',
    'Acid Lab',
    'Meth Lab'
];

const ILLEGAL_BUSINESS_PRICES = [
    1250000,
    1500000,
    2000000,
    2500000
];

const DRUG_ITEMS = [
    { name: 'Weed', description: '+10% passive income for one hour', price: 5000 },
    { name: 'Cocaine', description: '+25% money from !work for one hour', price: 15000 },
    { name: 'LSD', description: '+20% win chance in coinflip for one game', price: 25000 },
    { name: 'Meth', description: '-10 minutes from work cooldown for one hour', price: 50000 }
];

let blackjackGames = {};
let coinflipGames = {};
let rouletteGames = {};

const blockedUsers = [
    '953320066018062356',
    '1243942009434017835'
];

client.on("messageCreate", async (message) => {
    if (message.content.at(0) == '!' && message.author.id != '1417244307215089846' && !blockedUsers.includes(message.author.id)) {
        let user = await getUser(message.author.id, message.author.username);

        await db.run("UPDATE users SET name = ? WHERE id = ?", message.author.username, message.author.id)
        
        if (message.content == '!help') {
            let embed = new EmbedBuilder()
                .setTitle('Help Menu')
                .setDescription('Here are all available commands:')
                .addFields(
                    { name: '👔 Jobs', value: 
                        '`!jobs` - View available jobs\n' +
                        '`!getJob <job>` - Get an entry-level job\n' +
                        '`!quitJob` - Quit your current job\n' +
                        '`!work` - Work at your job to earn money\n' +
                        '`!promote` - Check or get a promotion' 
                    },
                    { name: '💰 Economy', value: 
                        '`!view` - View your money, job, and houses\n' +
                        '`!leaderboard` - See the richest players\n' +
                        '`!giveMoney <userId> <amount>` - Give money to a player\n' +
                        '`!adminGiveMoney <userId> <amount>` - (Admin) Give money to a user\n' +
                        '`!removeMoney <userId> <amount>` - (Admin) Remove money from a user'
                    },
                    { name: '🏠 Assets', value: 
                        '`!houseShop` - Buy houses for passive income\n' +
                        '`!businessShop` - Buy legal businesses\n' +
                        '`!illegalBusinessShop` - Buy illegal businesses (requires $1,000,000)\n' +
                        '`!passive` - Collect your passive income (hourly)'
                    },
                    { name: '🎲 Casino', value: 
                        '`!blackjack <bet>` - Play Blackjack\n' +
                        '`!coinflip <bet>` - Play Coinflip (Heads or Tails)\n' +
                        '`!roulette <bet> <choice>` - Play Roulette (number, red, black, even, odd)'
                    },
                    { name: '💊 Drugs', value: 
                        'Earn drugs from illegal businesses:\n' +
                        '`Weed` - +10% passive income (1h)\n' +
                        '`Cocaine` - +25% work payout (1h)\n' +
                        '`LSD` - +20% win chance in coinflip (1 game)\n' +
                        '`Meth` - -10 min work cooldown (1h)'
                    },
                    { name: '⚙️ System', value: 
                        '`!shutdown` - Shut down the bot (owner only)'
                    }
                )
                .setColor(0x00AE86);
            message.reply({ embeds: [embed] });
        }
        if (user !== undefined) {
            if (message.content == '!work') {
                if (user.job == 'None') {
                    let embed = new EmbedBuilder()
                        .setTitle('Work')
                        .addFields(
                            { name: '\u200B', value: 'You have no job!' }
                        );
                    message.reply({ embeds: [embed] });
                    return;
                }
                const now = Date.now();
                const lastWork = user.timeSinceLastWork;
                const cooldown = 60 * 30 * 1000;

                if (now - lastWork < cooldown) {
                    const remaining = Math.ceil((cooldown - (now - lastWork)) / 60000);
                    let embed = new EmbedBuilder()
                        .setTitle('Work')
                        .addFields(
                            { name: '\u200B', value: `You need to wait ${remaining} minutes to work again!` }
                        );
                    message.reply({ embeds: [embed] });
                    return;
                }

                let hoursWorked = Math.floor(Math.random() * 6) + 3;
                user.money += JOB_PAY[user.jobIndex[0]][user.jobIndex[1]] * hoursWorked;
                user.timesWorked++;
                user.timeSinceLastWork = now;
                let embed = new EmbedBuilder()
                    .setTitle('Work')
                    .addFields(
                        { name: '\u200B', value: `You worked for ${hoursWorked} hours and gained $${JOB_PAY[user.jobIndex[0]][user.jobIndex[1]] * hoursWorked}!` }
                    );
                message.reply({ embeds: [embed] });
                await updateUser(user);
            }
            else if (message.content == '!view') {
                const ownedHouses = await db.all('SELECT houseIndex FROM houses WHERE userId = ?', user.id);
                const ownedBusinesses = await db.all('SELECT businessIndex FROM businesses WHERE userId = ?', user.id);
                const ownedIllegalBusinesses = await db.all('SELECT businessIndex FROM illegal_businesses WHERE userId = ?', user.id);
                const inventoryItems = await db.all(
                    `SELECT items.name, items.description, inventory.quantity 
                    FROM inventory 
                    JOIN items ON inventory.itemId = items.id 
                    WHERE inventory.userId = ?`, user.id
                );

                const houseList = ownedHouses.length > 0 
                    ? ownedHouses.map(h => `🏠 ${HOUSE_NAMES[h.houseIndex]}`).join('\n') 
                    : 'None';

                const businessList = ownedBusinesses.length > 0 
                    ? ownedBusinesses.map(b => `🏢 ${BUSINESS_NAMES[b.businessIndex]}`).join('\n') 
                    : 'None';

                const illegalBusinessList = ownedIllegalBusinesses.length > 0 
                    ? ownedIllegalBusinesses.map(ib => {
                        const name = ILLEGAL_BUSINESS_NAMES[ib.businessIndex] || "Unknown Business";
                        return `🕵️ ${name}`;
                    }).join('\n') 
                    : 'None';

                const inventoryList = inventoryItems.length > 0
                    ? inventoryItems.map(i => `🎒 **${i.name}** x${i.quantity}`).join('\n')
                    : 'Empty';

                // Calculate passive income per hour
                let passiveIncome = 0;
                for (const h of ownedHouses) passiveIncome += HOUSE_INCOME[h.houseIndex];
                for (const b of ownedBusinesses) passiveIncome += BUSINESS_INCOME[b.businessIndex];

                const embed = new EmbedBuilder()
                    .setTitle(`${user.name}'s Profile`)
                    .setColor(0x3498db)
                    .addFields(
                        { name: '💰 Money', value: `$${user.money}`, inline: true },
                        { name: '👔 Job', value: `${user.job}`, inline: true },
                        { name: '💵 Passive Income/hr', value: `$${passiveIncome}`, inline: true },
                        { name: '🏠 Houses', value: houseList, inline: false },
                        { name: '🏢 Businesses', value: businessList, inline: false },
                        { name: '🕵️ Illegal Businesses', value: illegalBusinessList, inline: false },
                        { name: '🎒 Inventory', value: inventoryList, inline: false },
                    )
                    .setTimestamp();

                message.reply({ embeds: [embed] });
            }
            else if (message.content == '!jobs') {
                let reply = JOBS.map((level, i) => {
                    return level.map((job, j) => `${job} ($${JOB_PAY[i][j]}/hr)`).join(' -> ');
                }).join('\n\n');

                message.reply(reply);
            }
            else if (message.content.startsWith('!getJob') || message.content.startsWith('!getjob')) {
                const args = message.content.split(' ');
                if (args.length < 2) {
                    message.reply('Usage: !getJob <Job Name>');
                    return;
                }
                const jobName = args.slice(1).join(' ').toLowerCase();

                if (user.job !== 'None') {
                    message.reply('You already have a job!');
                    return;
                }
                if (JOBS[1][0].toLowerCase() == jobName) {
                    user.job = JOBS[1][0];
                    user.jobIndex = [1, 0];
                    message.reply(`Congrats, you are now a ${jobName}!`);
                    user.timesWorked = 0;
                    await updateUser(user);
                }
                else if (JOBS[2][0].toLowerCase() == jobName) {
                    user.job = JOBS[2][0];
                    user.jobIndex = [2, 0];
                    message.reply(`Congrats, you are now a ${jobName}!`);
                    user.timesWorked = 0;
                    await updateUser(user);
                }
                else if (JOBS[3][0].toLowerCase() == jobName) {
                    user.job = JOBS[3][0];
                    user.jobIndex = [3, 0];
                    message.reply(`Congrats, you are now a ${jobName}!`);
                    user.timesWorked = 0;
                    await updateUser(user);
                }
                else if (JOBS[4][0].toLowerCase() == jobName) {
                    user.job = JOBS[4][0];
                    user.jobIndex = [4, 0];
                    message.reply(`Congrats, you are now a ${jobName}!`);
                    user.timesWorked = 0;
                    await updateUser(user);
                }
                else if (JOBS[5][0].toLowerCase() == jobName) {
                    user.job = JOBS[5][0];
                    user.jobIndex = [5, 0];
                    message.reply(`Congrats, you are now a ${jobName}!`);
                    user.timesWorked = 0;
                    await updateUser(user);
                }
                else {
                    message.reply('You can only choose an entry-level job!');
                }
            }
            else if (message.content.startsWith('!quitJob') || message.content.startsWith('!quitjob')) {
                if (user.job !== 'None') {
                    user.job = 'None';
                    message.reply('You have quit your job!');
                    user.timesWorked = 0;
                    await updateUser(user);
                }
                else {
                    message.reply('You have no job, bum!');
                }
            }
            else if (message.content.startsWith('!blackjack') || message.content.startsWith('!bj')) {
                if (blackjackGames[message.author.id] && !blackjackGames[message.author.id].finished) {
                    message.reply('You already have an ongoing game!');
                    return;
                }
                const args = message.content.split(' ');
                const bet = parseInt(args[1]);

                if (!bet || bet < 0) {
                    message.reply('Please enter a valid bet amount. Usage: !blackjack <bet>')
                    return;
                }

                if (bet > user.money) {
                    message.reply('You do not have enough money for that bet!');
                    return;
                }

                user.money -= bet;
                await updateUser(user);

                let playerHand = Math.floor(Math.random() * 11) + 1;
                let dealerHand = Math.floor(Math.random() * 11) + 1;
                
                blackjackGames[message.author.id] = { playerHand, dealerHand, finished: false, bet };

                const embed = new EmbedBuilder()
                    .setTitle('Blackjack')
                    .addFields(
                        { name: 'Your Total', value: `${playerHand}`, inline: true },
                        { name: 'Dealer\'s Total', value: `${dealerHand}`, inline: true },
                    );

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId('stand').setLabel('Stand').setStyle(ButtonStyle.Secondary),
                    )
                message.reply({ embeds: [embed], components: [row] });
            }
            else if (message.content == '!promote') {
                if (user.timesWorked >= PROMOTION_REQUIREMENT[user.jobIndex[0]][user.jobIndex[1]]) {
                    user.job = JOBS[user.jobIndex[0]][user.jobIndex[1]+1];
                    user.jobIndex = [user.jobIndex[0], user.jobIndex[1]+1];
                    await updateUser(user);
                    message.reply(`You have been promoted to ${user.job}!`)
                }
                else {
                    message.reply(`You need ${PROMOTION_REQUIREMENT[user.jobIndex[0]][user.jobIndex[1]] - user.timesWorked} more days.`)
                }
            }
            else if (message.content == '!shutdown') {
                if (message.author.id !== '338844132904534048') {
                    message.reply('You do not have permission to do this!');
                    return;
                }

                await message.reply("Shutting Down...");

                try {
                    await closeDatabase();
                } catch (err) {
                    console.error('Error closing database: ', err);
                }

                await client.destroy();
                process.exit(0);
            }
            else if ((message.content.startsWith('!giveMoney') || message.content.startsWith('!givemoney'))) {
                const args = message.content.split(' ');
                const userGivenId = args[1];
                const moneyGiven = args[2];

                if (userGivenId == message.author.id) {
                    message.reply('You can\'t give yourself money!');
                    return;
                }
                if (!userGivenId || userGivenId.length != 18) {
                    message.reply('Correct usage: !giveMoney <user id> <money>');
                    return;
                }
                if (user.money < parseInt(moneyGiven)) {
                    message.reply('You do not have enough money for this!');
                    return;
                }

                let targetUser = await getUserWithId(userGivenId);
                await db.run("UPDATE users SET name = ? WHERE id = ?", targetUser.name, targetUser.id)

                user.money -= parseInt(moneyGiven);
                targetUser.money += parseInt(moneyGiven);

                await updateUser(user);
                await updateUser(targetUser);

                message.reply(`You have given ${targetUser.name} $${moneyGiven}!`)
            }
            else if ((message.content.startsWith('!adminGiveMoney') || message.content.startsWith('!admingivemoney')) && message.author.id === '338844132904534048') {
                const args = message.content.split(' ');
                const userGivenId = args[1];
                const moneyGiven = args[2];

                let user = await getUserWithId(userGivenId);
                await db.run("UPDATE users SET name = ? WHERE id = ?", user.name, user.id)

                user.money += parseInt(moneyGiven);
                await updateUser(user);

                message.reply(`You have given ${user.name} $${moneyGiven}!`)
            }
            else if ((message.content.startsWith('!removeMoney') || message.content.startsWith('!removemoney')) && message.author.id === '338844132904534048') {
                const args = message.content.split(' ');
                const userGivenId = args[1];
                const moneyGiven = args[2];
                
                let user = await getUserWithId(userGivenId);
                await db.run("UPDATE users SET name = ? WHERE id = ?", user.name, user.id)
                
                user.money -= parseInt(moneyGiven);
                await updateUser(user);

                message.reply(`You have removed $${moneyGiven} from ${user.name}!`)
            }
            else if (message.content.startsWith('!leaderboard')) {
                const rows = await db.all('SELECT * FROM users ORDER BY money DESC LIMIT 10');

                if (rows.length == 0) {
                    message.reply('No users found in leaderboard');
                    return;
                }

                let leaderboardText = rows
                    .map((user, index) => `**${index + 1}**. **${user.name}** - $${user.money}`)
                    .join('\n');

                const embed = new EmbedBuilder()
                    .setTitle('Leaderboard')
                    .setDescription(leaderboardText)
                    .setColor(0xFFD700);

                    message.reply({ embeds: [embed] });
            }
            else if (message.content.startsWith('!houseShop') || message.content.startsWith('!houseshop')) {
                const options = HOUSE_NAMES.map((name, i) => ({
                    label: name,
                    description: `Price: $${HOUSE_PRICES[i]}`,
                    value: `buy_house_${i}`
                }));

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_house')
                    .setPlaceholder('Select a house')
                    .addOptions(options);
                    
                    const row = new ActionRowBuilder().addComponents(selectMenu);
                    
                    const embed = new EmbedBuilder()
                        .setTitle('Real Estate Shop')
                        .setDescription('Select a house below to buy it.')
                        .setColor(0x00AE86);

                message.reply({ embeds: [embed], components: [row] });
            }
            else if (message.content.startsWith('!businessShop') || message.content.startsWith('!businessshop')) {
                const options = BUSINESS_NAMES.map((name, i) => ({
                    label: name,
                    description: `Price: $${BUSINESS_PRICES[i]}`,
                    value: `buy_business_${i}`
                }));

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_business')
                    .setPlaceholder('Select a business')
                    .addOptions(options);
                    
                    const row = new ActionRowBuilder().addComponents(selectMenu);
                    
                    const embed = new EmbedBuilder()
                        .setTitle('Business Shop')
                        .setDescription('Select a business below to buy it.')
                        .setColor(0x00AE86);

                message.reply({ embeds: [embed], components: [row] });
            }
            else if (message.content.startsWith('!illegalBusinessShop') || message.content.startsWith('!illegalbusinessshop')) {
                if (user.money < 1000000) {
                    message.reply('Who are you? Get out of here. (You need 1,000,000 to enter)');
                    return;
                }

                const options = ILLEGAL_BUSINESS_NAMES.map((name, i) => ({
                    label: name,
                    description: `Price: $${ILLEGAL_BUSINESS_PRICES[i]}`,
                    value: `buy_illegal_business_${i}`
                }));

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_illegal_business')
                    .setPlaceholder('Select an illegal business')
                    .addOptions(options);
                    
                    const row = new ActionRowBuilder().addComponents(selectMenu);
                    
                    const embed = new EmbedBuilder()
                        .setTitle('Illegal Business Shop')
                        .setDescription('Select an illegal business below to buy it.')
                        .setColor(0x00AE86);

                message.reply({ embeds: [embed], components: [row] });
            }
            else if (message.content.startsWith('!passive')) {
                const now = Date.now();
                const diff = now - user.lastPassiveIncome;
                const hoursPassed = Math.floor(diff / (60 * 60 * 1000));
                const interval = 60 * 60 * 1000;

                if (!user.lastPassiveIncome || user.lastPassiveIncome === 0) {
                    user.lastPassiveIncome = Date.now();
                    await updateUser(user);
                    message.reply('Passive timer started, come back in an hour!');
                    return;
                }
                
                const ownedHouses = await db.all('SELECT houseIndex FROM houses WHERE userId = ?', user.id);
                const ownedBusinesses = await db.all('SELECT businessIndex FROM businesses WHERE userId = ?', user.id);
                const ownedIllegalBusinesses = await db.all('SELECT businessIndex FROM illegal_businesses WHERE userId = ?', user.id)

                if (ownedHouses.length === 0 && ownedBusinesses.length === 0) {
                    message.reply('You have no passive income.');
                    return;
                }
                if (hoursPassed < 1) {
                    const remaining = Math.ceil((interval - diff) / 60000);
                    message.reply(`You need to wait ${remaining} minutes before claiming passive income again.`);
                    return;
                }

                let income = 0;
                for (const house of ownedHouses) {
                    income += HOUSE_INCOME[house.houseIndex] * hoursPassed;
                }
                for (const business of ownedBusinesses) {
                    income += BUSINESS_INCOME[business.businessIndex] * hoursPassed;
                }
                
                let drugsRecieved = [];

                for (const ib of ownedIllegalBusinesses) {
                    const drug = DRUG_ITEMS[ib.businessIndex];

                    if (drug) {
                        const existing = await db.get('SELECT quantity FROM inventory WHERE userId = ? and itemId = ?', user.id, ib.businessIndex + 1);
                        if (existing) {
                            await db.run('UPDATE inventory SET quantity = quantity + 1 WHERE userId = ? AND itemId = ?', user.id, ib.businessIndex + 1);
                        }
                        else {
                            await db.run('INSERT INTO inventory (userId, itemId, quantity) VALUES (?, ?, ?)', user.id, ib.businessIndex + 1, 1)
                        }
                        drugsRecieved.push(drug.name);
                    }
                }

                user.money += income;
                user.lastPassiveIncome = now;
                await updateUser(user);
                
                let replyMessage = `You have recieved $${income} in passive income!`;

                
                if (drugsRecieved.length > 0) {
                    replyMessage += `\nYou also received: ${drugsRecieved.join(', ')}!`;
                }
                message.reply(replyMessage)
            }
            else if (message.content.startsWith('!coinflip') || message.content.startsWith('!cf')) {
                if (coinflipGames[message.author.id] && !coinflipGames[message.author.id].finished) {
                    message.reply('You already have an ongoing game!');
                    return;
                }
                const args = message.content.split(' ');
                const bet = parseInt(args[1]);

                if (!bet || bet < 0) {
                    message.reply('Please enter a valid bet amount. Usage: !coinflip <bet>')
                    return;
                }

                if (bet > user.money) {
                    message.reply('You do not have enough money for that bet!');
                    return;
                }

                user.money -= bet;
                await updateUser(user);
                
                coinflipGames[message.author.id] = { finished: false, bet };

                const embed = new EmbedBuilder()
                    .setTitle('Coinflip');

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('heads').setLabel('Heads').setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId('tails').setLabel('Tails').setStyle(ButtonStyle.Secondary),
                    )
                message.reply({ embeds: [embed], components: [row] });
            }
            else if (message.content.startsWith('!roulette')) {
                if (rouletteGames[message.author.id] && !rouletteGames[message.author.id].finished) {
                    message.reply('You already have an ongoing game!');
                    return;
                }
                const args = message.content.split(' ');
                const bet = parseInt(args[1]);
                const choice = args[2]?.toLowerCase();
                
                if (!bet || bet < 0) {
                    message.reply('Please enter a valid bet amount. Usage: !roulette <bet> <number/red/black/even/odd>')
                    return;
                }

                if (bet > user.money) {
                    message.reply('You do not have enough money for that bet!');
                    return;
                }

                if (!choice) {
                    message.reply('Please specify your choice: a number (0-36), red, black, odd, or even.');
                    return;
                }

                user.money -= bet;
                await updateUser(user);
                
                rouletteGames[message.author.id] = { bet, choice, finished: false };

                message.reply(`Roulette spinning! you bet $${bet} on ${choice}...`);
                
                setTimeout(async () => {
                    const number = Math.floor(Math.random() * 37);
                    const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(number);
                    const isBlack = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35].includes(number);

                    let won = false;
                    const choiceLower = choice.toLowerCase();

                    if (parseInt(choiceLower) === number) {
                        won = true;
                    }
                    else if (choiceLower === 'red' && isRed) {
                        won = true;
                    }
                    else if (choiceLower === 'black' && isBlack) {
                        won = true;
                    }
                    else if (choiceLower === 'odd' && number !== 0 && number % 2 === 1) {
                        won = true;
                    }
                    else if (choiceLower === 'even' && number !== 0 && number % 2 === 0) {
                        won = true;
                    }

                    let payout = 0;
                    if (won) {
                        if (!isNaN(parseInt(choiceLower))) {
                            payout = bet * 35;
                        }
                        else {
                            payout = bet * 2;
                        }
                        user.money += payout;
                        await updateUser(user);
                        message.channel.send(`The roulette landed on **${number}**! You won $${payout}!`);
                    }
                    else {
                        message.channel.send(`The roulette landed on **${number}**. You lost $${bet}!`);
                    }

                    rouletteGames[message.author.id].finished = true;
                    delete rouletteGames[message.author.id];
                }, 2000)
            }
            else if (message.content.startsWith('!use')) {
                const args = message.content.split(' ');
                const drugName = args.slice(1).join(' ');
                if (!drugName) {
                    message.reply('Correct usage: !drug <drug>');
                    return;
                }

                const drug = DRUG_ITEMS.find(d => d.name.toLowerCase() === drugName.toLowerCase());
                if (!drug) {
                    message.reply('That drug doesn\'t exist');
                    return;
                }

                const item = await db.get('SELECT id FROM items WHERE name = ?', drug.name);
                const inventory = await db.get('SELECT quantity FROM inventory WHERE userId = ? AND itemId = ?', user.id, item.id);
                
                if (!inventory || inventory.quantity <= 0) {
                    message.reply(`You don't have any ${drugName}!`);
                    return;
                }

                let duration = drug.name === 'LSD' ? 1 : 60 * 60 * 1000;
                const expiresAt = Date.now() + duration;

                await db.run('INSERT OR REPLACE INTO active_drugs (userId, drugId, expiresAt) VALUES (?, ?, ?)',
                    user.id, drug.id, expiresAt
                );

                message.reply(`You used **${drug.name}**! Effect active.`);
            }
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        const userId = interaction.user.id;
        const blackjackGame = blackjackGames[userId];
        const coinflipGame = coinflipGames[userId];

        if (blackjackGame && !blackjackGame.finished) {
            if (interaction.customId == 'hit') {
                const card = Math.floor(Math.random() * 11) + 1;
                blackjackGame.playerHand += card;
    
                if (blackjackGame.playerHand > 21) {
                    blackjackGame.finished = true;
                    await interaction.update({
                        content: `You drew ${card} and busted with ${blackjackGame.playerHand}! You lost $${blackjackGame.bet}. Dealer Wins.`,
                        embeds: [],
                        components: []
                    });
                    return;
                }
    
                const embed = new EmbedBuilder()
                    .setTitle('Blackjack')
                    .addFields(
                        { name: 'Your Total', value: `${blackjackGame.playerHand}`, inline: true },
                        { name: 'Dealer\'s Total', value: `${blackjackGame.dealerHand}`, inline: true }
                    );
                await interaction.update({ embeds: [embed] });
            }
            else if (interaction.customId == 'stand') {
                while (blackjackGame.dealerHand < 17) {
                    blackjackGame.dealerHand += Math.floor(Math.random() * 11) + 1;
                }
    
                blackjackGame.finished = true;
    
                let result = '';
                let user = await getUser(interaction.user.id, interaction.user.username);
    
                if (blackjackGame.dealerHand > 21 || blackjackGame.playerHand > blackjackGame.dealerHand) {
                    user.money += blackjackGame.bet * 2;
                    await updateUser(user);
                    result = `You win $${blackjackGame.bet * 2}! Your total: ${blackjackGame.playerHand}, Dealer total: ${blackjackGame.dealerHand}`; 
                }
                else if (blackjackGame.playerHand < blackjackGame.dealerHand) {
                    result = `Dealer wins! You lost $${blackjackGame.bet}. Your total: ${blackjackGame.playerHand}, Dealer total: ${blackjackGame.dealerHand}`;
                }
                else {
                    user.money += blackjackGame.bet;
                    await updateUser(user);
                    result = `It's a tie! Your bet of $${blackjackGame.bet} has been returned. Your total: ${blackjackGame.playerHand}, Dealer total: ${blackjackGame.dealerHand}`;
                }
    
                delete blackjackGames[userId];
    
                await interaction.update({
                    content: `${result}`,
                    embeds: [],
                    components: []
                });
            }
        }
        if (coinflipGame && !coinflipGame.finished) {
            const coinflipResult = Math.floor(Math.random() * 2);     // 0 = heads, 1 = tails
            let userDecision = -1;

            if (interaction.customId == 'heads') {
                userDecision = 0;
            }
            if (interaction.customId == 'tails') {
                userDecision = 1;
            }
            if (userDecision == -1) {
                return interaction.reply({ content: 'Invalid coin flip choice' });
            }

            coinflipGame.finished = true;
            let result = '';
            let user = await getUser(interaction.user.id, interaction.user.username);
            const coinResultName = coinflipResult === 0 ? 'Heads' : 'Tails';

            if (userDecision == coinflipResult) {
                user.money += coinflipGame.bet * 2;
                await updateUser(user);
                result = `The coin landed on **${coinResultName}**! You won $${coinflipGame.bet * 2}`
            }
            else {
                result = `The coin landed on **${coinResultName}**. You lost $${coinflipGame.bet}.`;
            }

            delete coinflipGames[userId];

            await interaction.update({
                content: `${result}`,
                embeds: [],
                components: []
            });
        }
    }
    else if (interaction.isStringSelectMenu()) {
        if (interaction.customId == 'select_house') {
            const selectedValue = interaction.values[0];
            const houseIndex = parseInt(selectedValue.split('_')[2]);

            let user = await getUser(interaction.user.id, interaction.user.username);
            const owned = await db.get('SELECT * FROM houses WHERE userId = ? AND houseIndex = ?', user.id, houseIndex);
            if (owned) {
                await interaction.reply({ content: `You already own the **${HOUSE_NAMES[houseIndex]}**!` });
                return;
            }

            const price = HOUSE_PRICES[houseIndex];
            const name = HOUSE_NAMES[houseIndex];

            if (user.money < price) {
                await interaction.reply({ content: `You don't have enough money to buy the **${name}**!`})
                return;
            }

            user.money -= price;
            
            await updateUser(user);
            await db.run('INSERT OR IGNORE INTO houses (userId, houseIndex) VALUES (?, ?)', user.id, houseIndex);

            await interaction.reply({ content: `Congrats! You have bought a **${name}** for $${price}!` });
        }
        if (interaction.customId == 'select_business') {
            const selectedValue = interaction.values[0];
            const businessIndex = parseInt(selectedValue.split('_')[2]);

            let user = await getUser(interaction.user.id, interaction.user.username);
            const owned = await db.get('SELECT * FROM businesses WHERE userId = ? AND businessIndex = ?', user.id, businessIndex);
            if (owned) {
                await interaction.reply({ content: `You already own the **${BUSINESS_NAMES[businessIndex]}**!` });
                return;
            }

            const price = BUSINESS_PRICES[businessIndex];
            const name = BUSINESS_NAMES[businessIndex];

            if (user.money < price) {
                await interaction.reply({ content: `You don't have enough money to buy the **${name}**!`})
                return;
            }

            user.money -= price;
            
            await updateUser(user);
            await db.run('INSERT OR IGNORE INTO businesses (userId, businessIndex) VALUES (?, ?)', user.id, businessIndex);

            await interaction.reply({ content: `Congrats! You have bought a **${name}** for $${price}!` });
        }
        if (interaction.customId == 'select_illegal_business') {
            const selectedValue = interaction.values[0];
            const businessIndex = parseInt(selectedValue.split('_')[3]);

            let user = await getUser(interaction.user.id, interaction.user.username);
            const owned = await db.get('SELECT * FROM illegal_businesses WHERE userId = ? AND businessIndex = ?', user.id, businessIndex);
            if (owned) {
                await interaction.reply({ content: `You already own the **${ILLEGAL_BUSINESS_NAMES[businessIndex]}**!` });
                return;
            }

            const price = ILLEGAL_BUSINESS_PRICES[businessIndex];
            const name = ILLEGAL_BUSINESS_NAMES[businessIndex];

            if (user.money < price) {
                await interaction.reply({ content: `You don't have enough money to buy the **${name}**!`})
                return;
            }

            user.money -= price;
            
            await updateUser(user);
            await db.run('INSERT OR IGNORE INTO illegal_businesses (userId, businessIndex) VALUES (?, ?)', user.id, businessIndex);

            await interaction.reply({ content: `Congrats! You have bought a **${name}** for $${price}!` });
        }
    }
});

process.on('SIGINT', async () => {
    await closeDatabase();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeDatabase();
    process.exit(0);
});

client.login(process.env.BOT_TOKEN);