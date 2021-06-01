const { range, list, cartesian, update, isOdd } = require("../src/utils")
const { log } = require("console")

const arrayEq = (a, b) => a.toString() == b.toString()

const main = () => {
   log("list:", arrayEq(list(range(1, 4)), [1, 2, 3]))
   log("range:", arrayEq(list(range(0, 5)), [0, 1, 2, 3, 4]))
   log("cartesian:", arrayEq(list(cartesian([1, 2], [3, 4])), [[1, 3], [2, 3], [1, 4], [2, 4]]))
   log("update:", arrayEq(update(0, 5, [1, 2]), [5, 2]))
   log("isOdd:", isOdd(1) == true)
}

module.exports = main