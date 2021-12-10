
const fs = require('fs/promises')

const express = require('express')
const sharp = require('sharp')

const root = __dirname
const port = process.env.PORT || 3000

const app = express()

const router = express.Router()
app.use('/v1', router)

// GET /v1/draw?deck=<deck>
router.get('/draw', async (req, res) => {
  let deck_name = req.query.deck || 'bilibili'
  let deck = JSON.parse(await fs.readFile(`${root}/static/deck/${deck_name}.json`))
  let deck_type = JSON.parse(await fs.readFile(`${root}/static/deck_type/${deck.type}.json`))
  let deck_data = Object.assign({}, deck_type, deck)
  let cards = deck_data.suits.reduce((acc, suit) => {
      return acc.concat(suit.cards.map(card => `${suit.name}-${card.value}`))
  }, [])
  let card = cards[Math.floor(Math.random() * cards.length)]
  let img = sharp(`${root}/static/deck/${deck_name}/${card}.jpg`)
  if (Math.random() < 0.5) { img.rotate(180) }
  res.type('jpeg').send(await img.jpeg({ quality: 100 }).toBuffer())
})

app.listen(port, function () {
  console.log(`Now listening at http://localhost:${port}`)
})
