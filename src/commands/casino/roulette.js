const Discord = require('discord.js');
const Schema = require("../../database/models/economy");

let activeGames = {};

module.exports = async (client, interaction, args) => {
    let user = interaction.user;

    if (activeGames[user.id]) {
        return client.errNormal({ error: `You already have an active game!`, type: 'editreply' }, interaction);
    }

    Schema.findOne({ Guild: interaction.guild.id, User: user.id }, async (err, data) => {
        if (data) {
            function isOdd(num) {
                return num % 2 === 1;
            }

            let colour = interaction.options.getString('color');
            let money = parseInt(interaction.options.getNumber('amount'));
            let random = Math.floor(Math.random() * 37);

            if (!colour || !money) return client.errUsage({ usage: "roulette [color] [amount]", type: 'editreply' }, interaction);
            colour = colour.toLowerCase();
            if (money > data.Money) return client.errNormal({ error: `You are betting more than you have!`, type: 'editreply' }, interaction);
            if (money > 50000) return client.errNormal({ error: `You cannot bet more than 50,000!`, type: 'editreply' }, interaction);

            if (colour == "b" || colour.includes("black")) colour = 0;
            else if (colour == "r" || colour.includes("red")) colour = 1;
            else if (colour == "g" || colour.includes("green")) colour = 2;
            else return client.errNormal({ error: `No correct color specified!`, type: 'editreply' }, interaction);

            activeGames[user.id] = true;

            if (random == 0 && colour == 2) { // Green
                money *= 15;
                data.Money += money;
                data.save();

                delete activeGames[user.id];

                return client.embed({ title: `🎰・Multiplier: 15x`, desc: `You won **${client.emotes.economy.coins} $${money}**`, type: 'editreply' }, interaction);
            } else if (isOdd(random) && colour == 1) { // Red
                money = parseInt(money * 1.5);
                data.Money += money;
                data.save();

                delete activeGames[user.id];

                return client.embed({ title: `🎰・Multiplier: 1.5x`, desc: `You won **${client.emotes.economy.coins} $${money}**`, type: 'editreply' }, interaction);
            } else if (!isOdd(random) && colour == 0) { // Black
                money = parseInt(money * 2);
                data.Money += money;
                data.save();

                delete activeGames[user.id];

                return client.embed({ title: `🎰・Multiplier: 2x`, desc: `You won **${client.emotes.economy.coins} $${money}**`, type: 'editreply' }, interaction);
            } else { // Wrong
                data.Money -= money;
                data.save();

                delete activeGames[user.id];

                return client.embed({ title: `🎰・Multiplier: 0x`, desc: `You lost **${client.emotes.economy.coins} $${money}**`, type: 'editreply' }, interaction);
            }
        } else {
            client.errNormal({ error: `You have no ${client.emotes.economy.coins}!`, type: 'editreply' }, interaction);
        }
    });
}
