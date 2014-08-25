---
layout: post
title: Testing not just units
tldr:  The right tool for the right job!
tags: php testing unit integration functional system

---


<div markdown="1" class="edit">
I'm writing this as a web developer, and thus will talk about my habits as such.
</div>

Unit testing is great. You test behavior of units (i.e: instances of your classes),  
and mock their collaborators, mimicking how they should behave, most of the time.

*Most of the time*. Testing units permit to ensure that each piece of the puzzle is correctly shaped.  
It doesn't verify if the puzzle is resolvable, or if the final picture makes any sense :)

Testing is a vast world in software engineering. So vast that there is about 5 *levels*, and 18 *types*.  
Today, we are going to describe all of them. kthxbye.

Kidding, we'll just see which php tools exist for these different levels of testing, and why there should be more.

## Unit (or component - and its interfaces) testing

At the unit level, we all know "PHPUnit-by-Sebastian-Bergmann". [^1]  
Many use it for unit testing, which is normal, but also for functional testing, which can be less normal, if you refer to its name.  

<div markdown="1" class="divergence">
### What's wrong with screwing a screw with a double claw ?

Symfony for example, provides a `WebTestCase` class, directly extending `PHPUnit_Framework_TestCase`.  
This class is totally not about unit testing. Strange, isn't it ?

PHPUnit also has extensions, like the excellent [selenium2 extension](http://phpunit.de/manual/4.1/en/selenium.html).  
It has features that no other tool has: testing against multiple browsers out of the box.
</div>

But there is another tool in town: [phpspec](phpspec.net).  
This one focuses on one and only one goal: specify behavior of units.  
It won't help, neither promote writing integration tests with it. The right tool for the right job! 


## Functional (or integration or system) Testing

What I love in software industry, is the shitload of vocabulary that exist for basically the same thing :)  
I mostly hear about functional testing, but the [subtleties](http://en.wikipedia.org/wiki/Software_testing#Functional_vs_non-functional_testing) might worth a read.

In fact, what we mostly do is system testing. We verify that the software (the big black box) works as a whole.  
We just use its interface to interact with it, and should make expectations only on its output.

Now what exists in the php ecosystem to do that ? Well something that helps is the exellent [mink](http://mink.behat.org) library.  
But it's just a library. It won't help you writing tests, it will help you to interact with your application [^2].

## (User) Acceptance testing

Yet another form of testing. If you check the different definitions of testing variants, you'll often hear about **specifications** or **user stories**.

### BDD and Behat

[Behat](http://behat.org)'s unique goal is to describe expected behavior of something from a certain role point of view.  
It uses a DSL for that, which describes user stories in a natural language, making it a rosetta stone between the tests and the specs.

However, many things that are tested above have nothing to do directly with a user story. It may test edge cases, or be destructive testing.

And here we are, there is no [^3] such intermediate tool between unit testing and user acceptance testing, unless using PHPUnit or Behat.

## Introducing the intermediary

[Funk-spec](https://github.com/docteurklein/funk-spec) is a tentative to fill this gap. It's a very raw and young project, but its goal is simple:

    to run tests.

It does nothing by itself; has no mocking framework; has no assertion framework.  
It's useless. Until you write specs!

It's very inspired by phpspec, in the sense it uses the `it_` convention naming, classes and methods to determine what to run.  
It's based internally on the very very useful `Behat/TestWork` framework (used by `Behat/Behat` internally).

A basic usage looks like:

{% highlight php %}
<?php

namespace funk;

class TestSpec implements \Funk\Spec
{
    function it_should_fail()
    {
        throw new \LogicException;
    }

    function it_should_pass()
    {
        if (true === false) {
            throw new \LogicException('something is very wrong').
        }
    }
}
{% endhighlight %}

Simply run it using:

    php bin/funk <path to the spec(s)>

And it will output stuff like:

<pre>
<span class="f3">funk TestSpec</span>

<span class="f1">✘ it should fail</span> <span class="f6">funk/TestSpec.php</span> <span class="f3">+9</span>
(LogicException)
<span class="f2">✔ it should pass</span> <span class="f6">funk/TestSpec.php</span> <span class="f3">+14</span>
</pre>


<div markdown="1" class="divergence">
By the way, look at the `+9` above: it's a vim-compatible format!  
Just copy paste the whole path (or configure your terminal) and it will open the buffer at the correct line position :)
</div>

Being based on `Behat/TestWork`, it comes out of the box with many interesting features!

  * suites
  * autoload capabilities
  * environment variables
  * plugin system (extensions)

All of this is configurable through the funk.yml file, like presented in this example:

{% highlight yaml %}

default:
    autoload:
        functional: '%paths.base%'
        funk: '%paths.base%'

    suites:
        funk: ~

{% endhighlight %}


As said, this thing is just a **test runner**. It's up to you to write the rest.
It has no hooks out of the box right now, (like `setUp` and `tearDown`), and each example has its own instance.  
This isolation lets you use the constructor like phpspec does with `let`, to configure a common tool like mink for example!

## Conclusion

This tool is just a POC yet, but I'd like to see if it will find its usage.  
Being based on `Behat/TestWork`, it can very easily profit from existing extensions, since they are [90% compatible](https://github.com/Behat/MinkExtension/pull/130)!  
The [MinkExtension](https://github.com/Behat/MinkExtension) for example, would be a real benefit to permit multi-browser testing.

#### *Notes*:
[^1]: *Not sure if the name isn't just "PHPUnit", though ;)*
[^2]: *It's not entirely true, since mink contains an assertion utility.*
[^3]: *Or is it?*


*[POC]: Proof of Concept
