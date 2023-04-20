# Graffiti Chat Lab

This lab provides a basic working chat application that supports direct messaging and channel-based discussion.
You can try out the app [here](https://graffiti.garden/chat-lab/).

The app is built using the [Graffiti infrastructure](https://graffiti.garden) which enables the sending and receiving of messages in realtime.
You can find reference material on Graffiti's Vue interface [here](https://graffiti.garden/vue-plugin), which is also outlined below.

We encourage you to read through the code for this repo — there are a lot of comments to explain how everything is working.

## Graffiti Overview

Graffiti functions can be referenced with `this.$gf` in your javascript code and with just `$gf` in your HTML.
The first thing a Graffiti app should do is provide a place for the user to log in using the `$gf.toggleLogIn` function (see the log in button at the top of the `index.html` file). 

Once the user is logged in, the `$gf.me` variable will be equal to the user's unique ID -
in Graffiti this is called an "actor" to align with the [ActivityPub Specification](https://www.w3.org/TR/activitypub/#actors).
You will also be able to access functions that create and destroy data, described later in this document: `$gf.post` and `$gf.remove`.

Graffiti apps are designed to be both *interoperable* and *extensible*.
That means that you should be able to send messages from one chat app and receive them in another
while **also** having the freedom to add features to your chat app that might extend or change the data schema that it uses.

To meet both of those design goals, Graffiti apps uses the following work flow:
- Find a large collection of potentially relevant data.
- Filter the large data collection for data that your app can use.
- Process the filtered data to display in your interface.

In this chat app, this work flow is enacted to:
- Fetch all data in your "inbox" or a particular channel, filter that data for message data, and display those messages.
- Fetch all data related to a user's identity, filter that data for the user's most recent profile data, and display name of that profile.

We're hoping that you can use your existing knowledge of Vue to take care of the "displaying" step —
reading through the template source code should give you a good idea of how it's done.
So this documentation is going to go in depth on the fetching and filtering steps.
Finally, we'll go over the (simpler!) job of creating, modifying, and destroying data, as well as making private messages.

## Fetching Data

Data in Graffiti is organized by "context".
A context is essentially just a string (technically a "[URI](https://en.wikipedia.org/wiki/Uniform_Resource_Identifier)").
When you create data, you must assign that data to one or more contexts.
Then you, or others, can query for all data that has been assigned to a particular context.

The results of the context query are streamed in realtime, which is essential for a chat application.
You can stream these results manually using the asynchronous generator `$gf.objects`,
however Graffiti provides tooling to get a reactive Vue array which is what we use in the template app.

In the `setup()` function of the template app, we use `useObjects` to declare a reactive array called `messagesRaw`.
If we're using channel-based chat, the context we pass to `useObjects` is simply the name of the channel.
If we're using private messagine, the context we pass to `useObjects` is `$gf.me` —
this context is a good place to store any user-specific data and in this case the context is acting simultaneously as an inbox and outbox of private messages.

## Filtering Data

Each unit of Graffiti data is a special JSON object that has the following default properties:

- `published`: This is the timestamp that the data was published.
- `updated`: This is the timestamp that the data was last updated.
- `id`: This is a unique identifier of the data object itself.
- `actor`: This is a unique identifier corresponding to the creator of the data. Objects you create will have the same `actor` value as `$gf.me`.
- `context`: This is an array of all the contexts that the data has been assigned to.

The other object properties are entirely up to the application developer - you!
There are many ways you could try to represent a message in a JSON object,
but to be *interoperable* it's best to try and use a standard schema if one exists.

Once you've defined a schema for the data your app uses, you can use
[Array.filter()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter)
or whatever javascript you would like to filter the data that you've fetched.
In the template app, we apply filters as
[Vue computed properties](https://vuejs.org/guide/essentials/computed.html)
which reactively re-filter whenever the source data changes.

### Messages

Messages in the template app follow the [ActivityPub Note](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-note) schema, which is intended for short pieces of text like messages and tweets.
All this means is that our messages have a property [`type`](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-type) that is equal to `'Note'` and a property [`content`](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-content) that stores message text.

### Profile

To assign names to users in the template app, we use an [ActivityPub Profile](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-note).
This object has a property [`type`](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-type) that is equal to `'Profile'` and we use the property [`name`](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-name) to store the user's name.
Some apps might use other fields like [`icon`](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-icon) to store a profile image,
or [`summary`](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-summary) to share a quick bio about themselves.
That's OK! We don't need to filter out objects that have *extra* fields.

### Other Message Types
There are many standard objects, activities, and properties that are already laid out in the [ActivityVocabulary spec](https://www.w3.org/TR/activitystreams-vocabulary).
If you're adding new functionality to the chat app, we recommend checking if there's something that already fits your use case so that your app will naturally interoperate with other apps that added a similar feature. For example, you could:

- Add read receipts with [Read activities](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-read).
- Like messages with [Like activities](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-like).
- Flag messages as spam with [Flag activies](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-flag).
- Block other users with [Block activites](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-block).
- Build a contact list from friend requests built with [Offer activities and Relationship objects](https://www.w3.org/TR/activitystreams-vocabulary/#h-modeling-friend-requests)

## Creating and Modifying Data

To add data to the Graffiti server, all you need to do is call `$gf.post` on the base JSON object want to add.
The `actor`, `id`, `published`, and `updated` fields are added automatically, but you need to manually specify the context(s) that you would like the data to appear in. See the `sendMessage` method in the source code.

To edit data you can simply modify the object and it will sync with the server.
See the `saveEditMessage` method in the source code.

To delete a message you need to call `$gf.remove` on it. Be careful this can't be undone! Make sure to protect your users from accidental deletion.
See the `removeMessage` method in the source code.

**Note that you can only modify and delete your own data**. To "Like" an object you could create a [Like activities](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-like) that references the `id` of the object you are liking. Similarly, to delete someone else's message you could create a [Flag activies](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-flag) that references the `id` of the object you are trying to delete. Your interface can then react appropriately, either by displaying a like, or removing the message from your display.

## Private Messaging

To create a private message, you need to add a [`bto`](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-bto) or [`bcc`](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-bcc) property to the object.
These properties must have values that are arrays of Graffiti Actor URIs, corresponding to the user's that you want to be able to view the private message.
See the `sendMessage` method in the source code.

If either `bto` or `bcc` is not included, the object is public, if one or both fields are empty arrays, the object can only be seen by it's creator.
You can use objects with empty arrays, `bto: []`, to store interoperable application state. For example, to mark which messages the user has read or to keep track of the last chat they had open.

There is no functional difference between the `bto` and `bcc`, they simply mirror the semantic meaning of `to` and `cc` fields in emails.
