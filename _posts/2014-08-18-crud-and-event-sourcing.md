---
layout: post
title: CRUD and Event Sourcing
tldr:  "they didn't know it was bad, thus they did it."
tags: event-sourcing crud ddd
---

## WAT ?!

![wat](http://38.media.tumblr.com/25f6bf2fab253242e813d7e3532e81d5/tumblr_n9juazw2N51r6q3zqo1_r3_400.gif)

<div markdown="1" class="edit">
It's sad to say, but I'm not a DDD expert. To be honest, I'm quite a noob in this sphere
full of strange vocabulary, blue books, aggregates, and bounded contexts!
</div>

Let's go back in time, and try to understand this heresy.

### CRUD

As everybody knows, it's the acronym for Create, Retrieve Update, Delete.  
Many apps are crud oriented; many frameworks have crud generators (based on the model - MDD); many ORM's have CRUD events.  
It's the usual life-cycle of all the things. So everything's ok!

Let's look a bit closer:

  * CRUD is a "macro" point of view. Of course something is "updated", but what, why, and how ?
  * just don't use the word "update" already. It's like if all your variables were named "data"
  * the sacro-saint "Domain experts don't talk using only 4 verbs"
  * CRUD breaks CQS: it should be named CUD + R :)


Now sometimes CRUD fits well, and you'll be happy with it.  
And I have to find advantages to it, otherwise my whole article would be useless :)

### DDD

It's the idea to think and develop in terms of domain problems, and domain vocabulary (in an ubiquitous language).  
Compared to the simpler CRUD approach, a DDD one will result in a far richer usage of verbs and events.  
And those verbs and events will really fit the domain vocabulary, becoming *de facto* simpler to understand and to implement than crud.

### CQS and CQRS [^1]

It's the idea to separate read from writes.  
CQS is a really simple concept that can be implemented by having write-only methods (returning void),  
and read-only methods that don't modify any state, just querying and returning data.

CQRS goes a step further by saying these two separate parts should be segregated in two separate models (or APIs).

### Event Sourcing

ES is the idea of storing all the events that happened to an object.  
Knowing all the events that happened to a given object, it's possible to replay those events, to get back to a given state.  
It can be seen (at least) as another form of object persistence. An ORM stores state (and overrides previous state), while ES stores consequences of object behavior (or behavior itself, depending on how you see it).

There is an interesting question that is worth being answered: How to query this ?

### Projections

Having events in a store is cool, it permits to know what happened, how, and even maybe why.  
There are a lot of informations in it that we don't know yet we might take advantage of.  
For example, the number of items deleted after being viewed by user X; or the distribution of modifications on the time axis :)  
That is "metadata".

The actual data is stored inside the event itself, and (depending on the store impl.) serialized in a non-easily query-able fashion!  
In order to display the data back to the client (and in a performant way possibly), we might want to make projections of the data stored inside these events.

Those projections would be optimised for querying, denormalized, and each part of the app could have its own representation:

  * the "stats" tab would have pre-compiled data
  * the "admin" part would have lists with edit buttons
  * the "frontend" part would have data partitioned by user (or date)

Every projection can have its own persistence engine, be it mongo for denormalized data, or a graph DB for sake of "you name it".

That's where comes the "eventual consistency" thing. It's not that it's eventual**ly** correct :), it's just that system state can take some time to be accurately represented in projections. [^1]

### Impedance (mis)match

CRUD by itself has nothing to do with persistence, but we all are pragmatic here, and we know that we store objects for the long term.  
ORM's are here to persist the current state of an object into a relational database.  
This is not without consequences. There are some conceptual differences between those that complicates things.  
Moreover, most of the time, ORM's tend to promote one single model for both reads and write, in contradiction with CQS and CQRS.

ES, as a contrary, does not have this impedance mismatch. Even more, it **match**es the OO paradigms of object messaging and encapsulation,
if we consider emitted events as part of their public API [^1].  
It also forces you to have a separate model for reads, via projections, since reading using event-sourced object would be totally inefficient.

## Pick your choices

All of the above are combinable, you don't have to go full "CQRS/ES"!

  * One can DDD and store its objects using an ORM
  * One can DDD and use ES
  * One can DDD and mix read from writes [^1]
  * One can CRUD and apply CQS/CQRS
  * One can CRUD and use ES
  * One can use ES as an object persistence engine

That's for the last two bullets I'm writing this.  
I'm not saying it's good, but it's doable :)  

CRUD being 4 very simple verbs, it results in 4 very simple emitted events!  
Nothing forbids you to persist them in an event store.  


## The implementation

I'm currently playing with a php5.5+ [event-store](https://github.com/docteurklein/event-store). It's purely academic, but very interesting!  
I know there are [plenty of other](https://packagist.org/search/?q=event%20store) projects, including [event-centric](https://github.com/event-centric/EventCentric.Core) by @mathiasverraes, or [lite-cqrs](https://github.com/beberlei/litecqrs-php) by @beberlei!  
They all are a great source of knowledge.

This one provides an example of a CRUD + ES approach.  

[https://github.com/docteurklein/event-store/blob/master/example/_crud.php](https://github.com/docteurklein/event-store/blob/master/example/_crud.php)

Just take a look and tell me how much BS it is :)


*[CRUD]: Create Retrieve Update Delete
*[CQS]: Command-Query Separation.
*[CQRS]: Command-Query Responsibility Segregation.
*[ES]: Event Sourcing
*[DDD]: Domain-Driven Design
*[MDD]: Model-Driven Design
*[ORM]: Object Relational Mapper
*[API]: Application Programming Interface
*[OO]: Object Orientation (or Object Oriented Programming)
*[BS]: BullShit :)

#### *Notes*
[^1]: *I'd like to be confirmed or infirmed here.*

