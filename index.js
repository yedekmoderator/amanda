const session = require('express-session')
const { Client, SnowflakeUtil } = require('discord.js');
const Evernote = require('evernote');
const fetch = require('node-fetch');
const { search } = require('kaori');
const express = require('express');
const _ = require('lodash');

const { CONSUMER_KEY, CONSUMER_SECRET, TOKEN, CALLBACK_URL, AUTHOR, PORT } = process.env;

let channel;
let token;

const client = new Client();

client.on('ready', () => {
	console.log('ready');

	channel = client.channels.cache.get('772792996751605800');
});

client.on('message', async (message) => {
	if (message.author.bot || !(message.content.startsWith('.'))) return;

	if (message.author.id !== AUTHOR) return;

	const [command, ...args] = message.content.slice(1).trim().split(/ +/g);

	if (command === 'upload' || command === 'up') {
		let chan = message.mentions.channels.first();

		if (!chan) return message.channel.send('Kanal belirt.');

		let msg = await chan.messages.fetch(args[1]);

		if (!msg) return message.channel.send('Mesaj bulunamadı.');

		let title = args[2] ? args[2] : SnowflakeUtil.generate();

		fetch('https://metro-maid.herokuapp.com/note', {
			method: 'post',
        	body:    JSON.stringify({ title, note_body: msg.content }),
        	headers: { 'Content-Type': 'application/json' },
		})
		.then(() => message.channel.send('Mesaj gönderildi.'))
		.catch(console.error);
	}

});

const sites = [
	'yandere'
];

const tags = [
	'pussy',
	'ass',
	'open_shirt',
	'uncensored',
	'censored',
	'sex',
	'penis',
	'no_bra',
	'breasts',
	'naked',
	'cum',
	'bottomless',
	'swimsuits',
	'horns',
	'wings',
	'anus',
	'nopan',
	'pantsu',
	'skirt_lift',
	'anal'
];

const limit = [
	1,
	2,
	3
];

client.setInterval(async () => {
	const images = await search(_.sample(sites), {
		tags: [ _.sample(tags) ],
		limit: _.sample(limit),
		random: true
	})

	let i = images.filter(image => !(image.data.tags.includes('loli'))).map(image => image.fileURL);

	channel.send(i.join('\n')).catch(e => console.log(e));
}, 3e3);

client.login(TOKEN);


const app = express();
const elint = new Evernote.Client({
	consumerKey: CONSUMER_KEY,
	consumerSecret: CONSUMER_SECRET,
	sandbox: true
});

app.set('view engine', 'ejs');
app.use(express.json());
app.use(session({
  secret: 'edv433d4r4we3fr43et54',
  resave: false,
  saveUninitialized: true
}));


app.get('/', (req, res) => res.render('login.ejs'))

app.get('/login', (req, res) => {
	elint.getRequestToken(CALLBACK_URL, (e, oauthToken, oauthTokenSecret) => {
		if (e) throw e;

		req.session.oauthToken = oauthToken;
		req.session.oauthTokenSecret = oauthTokenSecret;

		res.redirect(elint.getAuthorizeUrl(oauthToken));
	})
});

app.get('/back', (req, res) => {
	elint.getAccessToken(
		req.session.oauthToken,
  		req.session.oauthTokenSecret,
  		req.query.oauth_verifier,
		(e, oauthToken, oauthTokenSecret, results) => {
			if (e) throw e;

			token = oauthToken;
			console.log(req.session);

			res.redirect('/login');
		}
	)
});

app.post('/note', (req, res) => {
	let authenticatedClient = new Evernote.Client({
		token,
		sandbox: true
	});
	let store = authenticatedClient.getNoteStore();
	let title = req.body.title;
	let note = req.body.note_body;

	if (!note) return;

	makeNote(store, title, note);
});

app.listen(PORT || 3000);

function makeNote(noteStore, noteTitle, noteBody, parentNotebook) {
  let nBody = '<?xml version="1.0" encoding="UTF-8"?>';
  nBody += '<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">';
  nBody += `<en-note>${noteBody}</en-note>`;

  let ourNote = new Evernote.Types.Note();
  ourNote.title = noteTitle;
  ourNote.content = nBody;
 
  if (parentNotebook && parentNotebook.guid) ourNote.notebookGuid = parentNotebook.guid;

  noteStore.createNote(ourNote)
    .catch(console.error);
};
