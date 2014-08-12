---
layout: post
title: Yell at yield!
tldr:  Generators. Count. Lazyness. Sadness.
---


php 5.5 has [support for generators](http://au1.php.net/generator). Yay!  
It is an `Iterator` and thus, is `Traversable`, but **not** `Countable`.


Technically, a method that contains a `yield` statement will always return a `Generator` instance (automatically).  
This said method can't have a non-empty return statement.

Now the question is: 

 > Cool bro, but how to count the number of results ?


A simple example:

{% highlight php %}

<?php
function yielded_range() {
    foreach (range(0, rand(0, 1O0)) as $i) {
        yield $i;
    }
}

var_dump(count(yielded_range())); // 1
var_dump(count(iterator_to_array(yielded_range()))); // 101

{% endhighlight %}

### The problem

Seen ? A `Generator` is not countable, we know it, and it's logical.  
How would you count something that is not yet generated?  
Well, sometimes you know.  
You can know the number of elements, and use yield to avoid putting everything in memory at once.


Now what ? Based on the emptiness of the result, I need to make different stuff.  
Why using lazy `Generator`s if you end up putting everything into memory (yes, `iterator_to_array`) ?


### The hack

The only solution I found is to throw an exception in the function that yields based on its knowledge,  
and instead of checking emptiness of the result, I try/catch.


{% highlight php %}
<?php
public function byProvider($class, $id)
{
    if (empty($this->events[$class][$id])) {
        throw new NoResult;
    }
    foreach ($this->events[$class][$id] as $event) {
            yield $event;
        }
    }
}

{% endhighlight %}


Now if anyone has a better solution for this, I'll take it :)

