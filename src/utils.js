const curry = require("ramda/src/curry") 

const list = (ls) => [...ls]

const range = function* (n, m) {
   let [i, j] = m == null ? [0, n] : [n, m];
   for (; i < j; i++) yield i;
}

const cartesian = function* (head, ...tail) {
   const remainder = tail.length ? cartesian(...tail) : [[]];
   for (let r of remainder) for (let h of head) yield [h, ...r];
}

const update = (idx, item, list) => {
   list.splice(idx, 1, item)
   return list
}

const isOdd = (num) => (num % 2) === 1

module.exports = {
   list,
   range,
   cartesian,
   update: curry(update),
   isOdd
}