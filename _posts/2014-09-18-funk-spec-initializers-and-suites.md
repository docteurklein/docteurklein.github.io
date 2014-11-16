---
layout: post
title: funk-spec initializers and TestWork suites
tldr:  or how to normalize the way you initialize common setup
tags: php test framework testwork funk-spec
---

<div markdown="1" class="edit">
**UPDATE**:

- @everzet [wrote an exellent article](http://everzet.com/post/99045129766/introducing-modelling-by-example) concerning a different usage of suites.
- The glue I am talking about at the end of this article [has been merged](https://github.com/docteurklein/funk-spec/pull/4) inside funk-spec as of now.
</div>

In most test frameworks, there are methods to initialize a test case.
The reason behind this is to ensure that all the test cases are executed with the same set of data, or, to be more generalistic, the same exact context, whatever the order of run. It facilitates **isolation**.

In phpunit, there is `setUp` and `tearDown`.
In phpspec, there is `let` and `letBe`.
In Behat, there is `__construct`.

As you can see, Behat took what I think to be the best approach: using the language features instead of inventing your own!
If you want to ensure that any method of your class will be called and treated equally, nothing better to not share anything
between them. And there is nothing better than 2 different instances for that.

Funk-spec takes unsurprisingly[^1] the same approach, by instantiating a new object for each call.

## Tell me how you reflect, I'll tell you how to instantiate

So funk-spec instantiates a new object for each method of the spec class.
Previously, it would only work if the constructor had no required argument.
Starting from [now](https://github.com/docteurklein/funk-spec/commit/3ffec8ed85417aa5b4ef8e736034177e6a07ba42#diff-0), your spec constructor can also receive arbitrary arguments [^2]!

All you have to do is to use a ["spec initializer"](https://github.com/docteurklein/funk-spec/blob/master/src/Funk/Initializer/Spec.php#L8).
This class, [once registered](https://github.com/docteurklein/event-store/blob/0b90a72444e3507a0e43fb2ad8493a0f827d4e1b/funk/Initializer/Extension.php#L33-L35), will be able to resolve the arguments necessary to a correct instantiation.
It will also be able to alter the instance **after** its instantiaion (via setter injection f.e).

An example of such an initializer IRL ? Imagine an integration test for a component that needs various and changing parameters (a database name or credentials f.e).
Would you hardcode those values in each and every test ? [^3]
No, you would create a custom initializer!


{% highlight php %}
<?php

class Store implements SpecInitializer
{
    private $stores;
    private $serializer;

    public function __construct()
    {
        $this->serializer = (new \Knp\Event\Serializer\Jms\Builder)->build();
        $this->stores = [
            'memory' => function(Suite $suite) { return new \Knp\Event\Store\InMemory; },
            'pdo'    => function(Suite $suite) { return new \Knp\Event\Store\Pdo\Store(
                new \PDO("pgsql:dbname={$suite->getSetting('dbname')}", null, null, [
                    \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                    \PDO::ATTR_EMULATE_PREPARES => 0,
                ]),
                $this->serializer
            ); },
            'mongo'  => function(Suite $suite) {
                return new \Knp\Event\Store\Mongo((new \MongoClient)->selectDB($suite->getSetting('dbname')), $this->serializer);
            },
        ];
    }

    public function isSupported(Suite $suite, \ReflectionClass $reflect)
    {
        return true;
    }

    public function resolveArguments(Suite $suite, \ReflectionMethod $constructor)
    {
        $arguments = $constructor->getParameters();
        foreach ($arguments as &$argument) {
            if ($argument->getClass() && is_a($argument->getClass()->name, 'Knp\Event\Store', true)) {
                $argument = $this->getStore($suite);
            }
        }

        return $arguments;
    }

    public function initialize(Suite $suite, Spec $spec)
    {
    }

    private function getStore(Suite $suite)
    {
        return call_user_func($this->stores[$suite->getName()], $suite);
    }
}
{% endhighlight %}

Aside from the boilerplate and the rawness of this code, its only goal is to find any argument that should be a `Knp\Event\Store` and resolve it as a real instance, [ready to be used](https://github.com/docteurklein/event-store/blob/0b90a72444e3507a0e43fb2ad8493a0f827d4e1b/funk/Knp/Event/DifferentEventClasses.php#L17-L24) by the different test cases.

## Enter the matrix

Independently from that, TestWork proposes an **awesome** feature: suites.

Suites can be seen as a (point of) view for your test suite.
In behat they are used to provide different contexts for the same features, or to filter features by a regex, or even by roles [^4]!

Each suite can have different settings that will impact the way the test suite is run.

As you can see above in the code snippet, initializers are aware of the current suite being run. Based on the specific suite settings, it will chose a specific store instance.

The `funk.yml` files permits to define suite-specific settings:

{% highlight yaml %}

default:
    autoload:
        'funk': '%paths.base%'

    suites:
        memory: ~
        pdo:
            dbname: event_store
        mongo:
            dbname: event

    extensions:
        funk\Initializer\Extension: ~


{% endhighlight %}

And the beauty of suites is that you can chose which suite to run (via the `--suite` parameter), but if you don't, it will run all the suites by default,
resulting in a (one dimensional) build matrix, that allows you to test your cases against different adapters.

There is a lot of power in this idea: it can for example favor multi-browser testing with selenium, without having to pollute your test suite at all! (And that's exactly what [Behat/MinkExtension](https://github.com/Behat/MinkExtension/blob/master/doc/index.rst#sessions) does).


## Conclusion

MinkExtension is not totally compatible with funk-spec (it's still too tied to Behat contexts), but a small glue could bring them together. That's my next experimentation step :)

The current implementation of spec initializers is still a bit raw, and the API may still evolve, but the concept is there!
Enjoy (or not) but feel free to comment below :)



#### *Notes*:
[^1]: *Both being based on the TestWork framework plus the fact I heavily lurked at behat code :)*
[^2]: *Isn't that nice ?*
[^3]: *You wouldn't dare :)*
[^4]: *Remember: In order To ..., **As a ...**, I need ...*


*[IRL]: In Real Life
*[API]: Application Programming Interface
