---
layout: post
title: phpspec, prophecy and iterators
tldr:  the good, the bad and the ugly, in no particular order :)
tags: php phpspec iterator mongo
---

[Phpspec](http://phpspec.net) and his friend prophecy are great tools.
They help build better code, by encouraging correct design decisions, 
and, more importantly, to think about your units.

## The problem (if any)

A lot of issues are open talking about Generators, Iterators and Traversables:

 * [https://github.com/phpspec/phpspec/issues/379](https://github.com/phpspec/phpspec/issues/379)
 * [https://github.com/phpspec/phpspec/issues/179](https://github.com/phpspec/phpspec/issues/179)
 * [https://github.com/phpspec/prophecy/issues/26](https://github.com/phpspec/prophecy/issues/26)
 * [https://github.com/phpspec/phpspec/pull/286](https://github.com/phpspec/phpspec/pull/286)
 * [my totally wrong https://github.com/phpspec/prophecy/pull/115](https://github.com/phpspec/prophecy/pull/115)
 * [http://www.uvd.co.uk/blog/labs/making-assertions-on-dateperiod-instances-with-phpspec/](http://www.uvd.co.uk/blog/labs/making-assertions-on-dateperiod-instances-with-phpspec/)
 * surely many others

Enough to see there is actually some room for improvement. **Sure enough ?**  
Iterators are not that easy to describe, as they can have a lot of different responsibilities and behaviors, not talking about the horrible fact that they maintain a visible state, full of side effects.
The api is not clean, the different implementations behave the way they want; **enough to avoid them!**

## One (potential) solution

You have maybe noticed, lately I started playing with php 5.5 generators[^1].

While I was speccing [something](https://github.com/docteurklein/event-store/blob/6cc107f529e096c06406952771622f4b15263346/src/Knp/Event/Store/Mongo.php#L33) using a MongoCursor[^1], I felt the pain.
It took me time and suffering to specify **how** my MongoCursor[^1] would behave, when it should have been easy!  
It's just an array[^2], after all!

Here is how it looks like:

{% highlight php %}
<?php
function its_findBy_retrieves_emitter_specific_events(\MongoCursor $cursor, Event $event)
{
    $cursor->rewind()->willReturn();
    $cursor->count()->willReturn(1);
    $cursor->valid()->willReturn(true, false);
    $cursor->next()->willReturn();
    $cursor->current()->willReturn($event);
    $events = $this->findBy('A\Test\FQCN', 1);
    $events->shouldHaveType('Traversable');
}
{% endhighlight %}

Maybe it's not *that* complicated. Once you know.  
For those who don't, I came up with a little [phpspec extension](https://gist.github.com/docteurklein/dc256bf05d284ca5e57e), which is a totally untested POC!

It greatly simplifies the definition of Iterators behavior. See by yourself with the previous example:

{% highlight php %}
<?php
function its_findBy_retrieves_emitter_specific_events(\MongoCursor $cursor, Event $event)
{
    $cursor->iterates([$event]);
    $events = $this->findBy('A\Test\FQCN', 1);
    $events->shouldHaveType('Traversable');
}
{% endhighlight %}


### The (crappy) implementation

I haven't find a better way to do this, so currently I [had to extend](https://gist.github.com/docteurklein/dc256bf05d284ca5e57e#file-collaborator-php-L9)[^3] the base [Collaborator class](https://github.com/phpspec/phpspec/blob/301f0023fe30d242243b8f7549f3c9879ebe137e/src/PhpSpec/Wrapper/Collaborator.php#L22) to add an `iterates` method.  
This method simply automates the configuration of the Iterator double,
mainly *via* its `next`, `current`, `valid` and `rewind` methods.

The rest is just usual [extension boilerplate](https://gist.github.com/docteurklein/dc256bf05d284ca5e57e#file-extension-php-L9), except one particularly interesting part: the [Maintainer class](https://gist.github.com/docteurklein/dc256bf05d284ca5e57e#file-maintainer-php-L16).

This one is the one who decides wether or not it should replace the current (standard) collaborator with a more specific one, oriented for Iterators (thanks to its `iterates` method).  
It does that using php reflection capabilites, yielding every collaborator that is actually an Iterator[^1].

Interested ? Check it and let me know!

#### *Notes*
[^1]: *Which **is** an Iterator :)*


[^2]: *In it's purest form, [at least](https://www.google.com/search?q=define%3A+array&oq=define%3A+array&aqs=chrome..69i57j69i58.1663j0j7&sourceid=chrome&es_sm=122&ie=UTF-8)*

[^3]: Beurk

