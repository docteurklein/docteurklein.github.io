---
layout: post
title: using yield generator with mongodb
tldr:  don't even try!
---

`MongoCollection::find` returns [`MongoCursor`](http://php.net/manual/en/class.mongocursor.php) instances.  
Those are iterators.

Why on earth would I use a generator (which **is** an `Iterator`) for something that is an iterator already?  
I can alrady iterate my results one by one, without loading everything in memory.

Well, as stated [in another post](http://docteurklein.github.io/2014/08/12/yell-at-yield/#the-problem),
sometimes you have to do extra stuff on each result.  
Hydration for example.

I could wrap the mongo iterator in a special iterator, that iterates over its internal iterator, 
and hydrates the current result before returning it.  
BTW, there is a class for that! That's what [`IteratorIterator`s](http://php.net/iteratoriterator) are made for.

But Generators are made to [avoid writing such Iterator classes by hand](http://php.net/manual/en/language.generators.overview.php#language.generators.overview)!

## The problem

It's all nice, but this won't work, currently:


{% highlight php %}
<?php
foreach ((new \MongoDB(new \MongoClient, 'test'))->selectCollection('test')->find(['provider_id' => (string)$id,]) as $document) {
     yield $this->serializer->unserialize($document);
}

{% endhighlight %}

And this is due to known issues, that are registered here:

 * [ https://jira.mongodb.org/browse/PHP-977 ](https://jira.mongodb.org/browse/PHP-977)
 * [ https://jira.mongodb.org/browse/PHP-820 ](https://jira.mongodb.org/browse/PHP-820)
 * and maybe others ?

## The solution

Instead you have to fallback to the pre-generator era, and write your own IteratorIterator:

{% highlight php %}
<?php
final class CursorIterator extends \IteratorIterator
{
    public function __construct(\Traversable $t, $serializer)
    {
        parent::__construct($t);
        $this->serializer = $serializer;
    }

    public function current()
    {
        return $this->serializer->unserialize(parent::current());
    }
}

{% endhighlight %}

## Conclusion

Generators are not yet the silver bullet :)  
Of course, I'm not blaming anything nor anyone. It's all pure happiness to be able to play with all this good work!  
I'm just sharing my thoughts and experience.  
Talking about that, I'd like to hear what [@jmikola](https://twitter.com/jmikola) is thinking about that?  

PS: You can also have a look at [the complete implementation](https://github.com/docteurklein/event-store/blob/87c47caa791449e1b40a6e59416ea8d05e110079/src/Knp/Event/Store/Mongo.php).


