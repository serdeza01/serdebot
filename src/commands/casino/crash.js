const Discord = require('discord.js');
const Schema = require("../../database/models/economy");

let activeGames = {};

module.exports = async (client, interaction, args) => {
    let user = interaction.user;

    if (activeGames[user.id]) {
        return client.errNormal({ error: `You already have an active game!`, type: 'editreply' }, interaction);
    }

    var result = Math.ceil(Math.random() * 12);

    Schema.findOne({ Guild: interaction.guild.id, User: user.id }, async (err, data) => {
        if (data) {
            let money = parseInt(interaction.options.getNumber('amount'));
            if (!money) return client.errUsage({ usage: "crash [amount]", type: 'editreply' }, interaction);

            if (money > 65000) return client.errNormal({ error: `You cannot bet more than 65,000!`, type: 'editreply' }, interaction);
            
            if (money > data.Money) return client.errNormal({ error: `You are betting more than you have!`, type: 'editreply' }, interaction);

            activeGames[user.id] = true;

            const row = new Discord.ActionRowBuilder()
                .addComponents(
                    new Discord.ButtonBuilder()
                        .setCustomId('crash_stop')
                        .setEmoji("🛑")
                        .setStyle(Discord.ButtonStyle.Danger),
                );

            const disableRow = new Discord.ActionRowBuilder()
                .addComponents(
                    new Discord.ButtonBuilder()
                        .setCustomId('crash_stop')
                        .setEmoji("🛑")
                        .setStyle(Discord.ButtonStyle.Danger)
                        .setDisabled(true),
                );

            client.embed({
                desc: `Crash started by ${user}・React 🛑 to stop`,
                fields: [
                    {
                        name: `Multiplier`,
                        value: `1x`,
                        inline: true,
                    },
                    {
                        name: `Profit`,
                        value: `**0**`,
                        inline: true,
                    }
                ],
                components: [row],
                type: 'editreply'
            }, interaction).then(msg => {
                let multiplier = 1;
                let index = 0;

                let times = result + 1;
                let timer = 2000 * times;

                const difficultyFactor = Math.log10(money + 1); // Logarithmic scaling for difficulty

                const interval = setInterval(() => {
                    if (index === result + 1) { 
                        clearInterval(interval);
                        delete activeGames[user.id];
                        return; 
                    } else if (index === result) {

                        Schema.findOne({ Guild: interaction.guild.id, User: user.id }, async (err, data) => {
                            if (data) {
                                data.Money -= money;
                                data.save();
                            }
                        });

                        delete activeGames[user.id];

                        return client.embed({
                            title: `Crash Results of ${user}`,
                            desc: `${msg}`,
                            type: 'edit',
                            fields: [
                                {
                                    name: `Loss`,
                                    value: `**${money}**`,
                                    inline: false,
                                }
                            ]
                        }, msg);

                    } else {
                        index += 1;
                        multiplier += 0.20 / difficultyFactor; // Adjusting the multiplier increment based on difficulty factor

                        let calc = money * multiplier;
                        let profit = calc - money;

                        if (multiplier === 1) {
                            profit = 0; // No profit at 1x multiplier
                        }

                        client.embed({
                            desc: `Crash started by ${user}・React 🛑 to stop`,
                            type: 'edit',
                            fields: [
                                {
                                    name: `Multiplier`,
                                    value: `${multiplier.toFixed(1)}x`,
                                    inline: true,
                                },
                                {
                                    name: `Profit`,
                                    value: `**$${profit.toFixed(2)}**`,
                                    inline: true,
                                }
                            ],
                            components: [row]
                        }, msg);
                    }
                }, 2000);

                const filter = i => i.user.id === interaction.user.id;
                interaction.channel.awaitMessageComponent({ filter, max: 1, time: timer })
                    .then(async i => {
                        if (i.customId == "crash_stop") {
                            i.deferUpdate();

                            index = result + 1;
                            profit = money * multiplier;

                            if (multiplier === 1) {
                                profit = 0; // No profit at 1x multiplier
                            }

                            Schema.findOne({ Guild: interaction.guild.id, User: user.id }, async (err, data) => {
                                if (data) {
                                    data.Money += parseInt(profit);
                                    data.save();
                                }
                            });

                            delete activeGames[user.id];

                            return client.embed({
                                desc: `Crash Results of ${user}`,
                                fields: [
                                    {
                                        name: `Profit`,
                                        value: `**$${profit.toFixed(2)}**`,
                                        inline: false,
                                    }
                                ],
                                components: [disableRow],
                                type: 'edit'
                            }, msg);

                        }
                    })
                    .catch(async () => {
                        index = result + 1;

                        Schema.findOne({ Guild: interaction.guild.id, User: user.id },
                            async (err, data) => {
                                if (data) {
                                    data.Money -= money;
                                    data.save();
                                }
                            }
                        );

                        delete activeGames[user.id];

                        return client.embed({
                            desc: `Crash Results of ${user}`,
                            type: 'edit',
                            fields: [
                                {
                                    name: `Loss`,
                                    value: `**${money}**`,
                                    inline: false,
                                }
                            ],
                            components: [disableRow]
                        }, msg);

                    });
            });

        } else {
            client.errNormal({ error: `You have no ${client.emotes.economy.coins}!`, type: 'editreply' }, interaction);
        }
    });
}
