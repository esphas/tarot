
const fs = require('fs/promises')
const path = require('path')
const sharp = require('sharp')
const { createBrotliCompress } = require('zlib')

/**
 * @param {PathLike} root
 */
const tarot = exports = module.exports = function(root) {
    let dir_deck_type = path.join(root, 'static/deck_type')
    let dir_deck = path.join(root, 'static/deck')
    let dir_layout = path.join(root, 'static/layout')
    let deck_types = {}
    let decks = {}
    let layouts = {}
    let get_deck_type = async function(name) {
        if ( name === '' ) { return {} }
        if ( deck_types[name] != null ) { return deck_types[name] }
        let deck_type = await fs.readFile(path.join(dir_deck_type, name + '.json'), 'utf8')
            .then(JSON.parse)
        deck_types[name] = deck_type
        return deck_type
    }
    let get_deck = async function(name) {
        if ( name === '' ) { return {} }
        if ( decks[name] != null ) { return decks[name] }
        let rdeck = await fs.readFile(path.join(dir_deck, name + '.json'), 'utf8')
            .then(JSON.parse)
        let deck_type = await get_deck_type(rdeck.type)
        let deck = Object.assign({}, deck_type, rdeck)
        for ( let suit of deck.suits ) {
            for ( let card of suit.cards ) {
                card.path = path.join(dir_deck, name, `${suit.name}-${card.value}.jpg`)
            }
        }
        deck.blank_path = path.join(dir_deck, name, 'blank.jpg')
        deck.back_path = path.join(dir_deck, name, 'back.jpg')
        decks[name] = deck
        return deck
    }
    let get_layout = async function(name) {
        if ( name === '' ) { return {} }
        if ( layouts[name] != null ) { return layouts[name] }
        let layout = await fs.readFile(path.join(dir_layout, name + '.json'), 'utf8')
            .then(JSON.parse)
        layouts[name] = layout
        return layout
    }
    let draw_card = async function({ deck_name, layout_name, width, height }) {
        let deck = await get_deck(deck_name || 'bilibili')
        let layout = await get_layout(layout_name || 'draw')
        // draw
        let drawn = await Promise.all(layout.draws.map(async draw => {
            let suits = null
            if ( draw.includes && draw.includes.length > 0 ) {
                suits = deck.suits.filter(suit => draw.includes.includes(suit.name))
            } else if ( draw.excludes && draw.excludes.length > 0 ) {
                suits = deck.suits.filter(suit => !draw.excludes.includes(suit.name))
            } else {
                suits = deck.suits
            }
            let cards = suits.reduce((acc, suit) => acc.concat(suit.cards), [])
            let card = cards[Math.floor(Math.random() * cards.length)]
            let img = sharp(card.path)
            if ( draw.reversable ) {
                if (Math.random() < 0.5) { img.rotate(180) }
            }
            let metadata = await img.metadata()
            return {
                img, metadata, position: draw.position || [0, 0],
            }
        }))
        if ( drawn.length <= 1 ) {
            return drawn[0].img.png()
        }
        // composite
        let [res_width, res_height] = drawn.reduce((acc, { metadata, position }) => {
            acc[0] = Math.max(acc[0], position[0] + metadata.width)
            acc[1] = Math.max(acc[1], position[1] + metadata.height)
            return acc
        }, [0, 0])
        let res = sharp({
            create: {
                width: res_width,
                height: res_height,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            }
        }).png()
        .composite(await Promise.all(drawn.map(async ({ img, position }) => {
            return {
                input: await img.toBuffer(),
                left: position[0],
                top: position[1],
            }
        })))
        if ( width !== 0 || height !== 0 ) {
            // resize
            let opt = {}
            if ( width !== 0 ) opt.width = width
            if ( height !== 0 ) opt.height = height
            res = sharp(await res.toBuffer()).resize(opt)
        }
        return res
    }
    return {
        root,
        decks,
        load_deck: get_deck,
        draw_card,
    }
}




