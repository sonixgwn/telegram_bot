const numeral = require('numeral');

function moneyFormat(amount) {
    return numeral(amount).format('0,0');
}

module.exports = { moneyFormat };