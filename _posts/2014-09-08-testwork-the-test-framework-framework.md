---
layout: post
title: TestWork, the test framework's framework
tldr:  or how to build a testing tool in no time!
tags: php test framework behat funk-spec
---

"[Why](https://twitter.com/docteur_klein/status/430652080156835840) would you do that ?" I hear already.  
[As stated previously](http://docteurklein.github.io/2014/08/22/integration-functional-system-testing-using-funk-spec/), sometimes there is no tool available for what you try to achieve, and if there is, it may be a hammer to kill an elephant, or a bazooka to kill a fly.

How would you organize your code and run it if you hadn't a tool that does it for you ?  
How would you manage errors, failures, pending tests, success and exceptions ?

I remember the times of [Lime](http://symfony.com/legacy/doc/jobeet/1_4/en/08?orm=Doctrine), the symfony1 test framework, where everything was procedural and global.  
But it did the job! You had your exit status code: 0 (green) or 1 (failed).  
Would you rewrite the whole thing if you too wanted to handle exit status codes of your test suite ?

## Introducing TestWork

You don't have to rewrite it anymore :)  
@everzet came with the wonderful idea of normalizing and centralizing the common stuff you need to build a testing tool.  
I think he was too bored to rewrite (or see) the same concepts again and again , be it in [behat](https://github.com/Behat/Behat) or [phpspec|prophecy](https://github.com/phpspec).

That's where comes from TestWork. It is born during the rewrite of Behat3, and ~40% of it is handled by TestWork.


You can retrieve a lot of concepts of prophecy inside TestWork like the call center, as well as phpspec's output printers/presenters and exceptions stringers, and of course some things that were originally in behat.

All of them have some things in common. They all have a plugin/extension system, many ways of presenting output (xUnit, progress, html, pretty, ...), handle exceptions, and ultimately, execute arbitrary userland code (that is: tests).

The non-exhaustive list of what TestWork is able to give you:

  * extensions (plugins)
  * config files with cascading and imports
  * environment variables configuration
  * suites
  * per-suite configuration
  * autoloading
  * terminal output formatting
  * exception handling
  * multiple sources of test cases

All those tools implement this list in their own way. Well, not anymore.  
[funk-spec](https://github.com/docteurklein/funk-spec) is now following Behat3 by using TestWork too, which makes behat extensions compatible with funk-spec!

Many components of funk-spec are simply directly using TestWork implementations.  
Some parts, like the file locator, implement a TestWork interface, and are plugged-in thanks to the usage of extensions.

Yes, in TestWork everything is plugged-in together thanks to the usage of a DIC (the symfony DIC, actually).  
It's super easy to replace or implement one part of the software by simply defining, tagging and registering a class as a service.


## We need to go deeper

Let's have a look at how it looks like technically.

Being a CLI app, all is bootstrapped by an [`ApplicationFactory`](https://github.com/docteurklein/funk-spec/blob/bd5181f91a1671bba18a4945b50dd083e5e81bba/src/Funk/ApplicationFactory.php):

### Application

{% highlight php %}
<?php

class ApplicationFactory extends Base
{
    protected function getDefaultExtensions()
    {
        $processor = new ServiceProcessor;

        return array(
            // Testwork extensions
            new CliExtension($processor),
            new CallExtension($processor),
            new SuiteExtension($processor),
            new EnvironmentExtension($processor),
            new SpecificationExtension($processor),
            new EventDispatcherExtension($processor),
            new FilesystemExtension($processor),
            new ExceptionExtension($processor),
            new HookExtension($processor),
            new AutoloaderExtension,
            new OutputExtension('pretty', [new \Funk\Output\Formatter\Factory\Pretty]),

            // Funk extensions
            new TesterExtension($processor),
        );
    }

    // ...
}

{% endhighlight %}

<div markdown="1" class="edit">
You'll notice that I just created **one** `TesterExtension`, all the other functionalities are directly using TestWork classes.  
Be careful not to follow too closely my example, you should split extensions as soon as needed. Think of SRP better than I did :)
</div>

### Flexion, Extension, Flexion, Extension!

Some of these extensions will define extension points. The `SpecificationExtension` for example, will search for `SpecficiationLocator`s tagged as such.  


All you have to do is to plug an extension and implement and register a `SpecficiationLocator` that returns a `SpecficiationIterator` of your own.

{% highlight php %}
<?php

class TesterExtension extends BaseExtension
{
    public function load(ContainerBuilder $container, array $config)
    {
        $definition = new Definition('Funk\Tester\SpecTester', [
            new Reference(self::SPECIFICATION_TESTER_ID.'.example.event_dispatcher'),
            new Reference(EventDispatcherExtension::DISPATCHER_ID),
        ]);
        $container->setDefinition(self::SPECIFICATION_TESTER_ID, $definition);

        $definition = new Definition('Funk\Tester\ExampleTester\EventDispatcher', [
            new Reference(self::SPECIFICATION_TESTER_ID.'.example.default'),
            new Reference(EventDispatcherExtension::DISPATCHER_ID),
        ]);
        $container->setDefinition(self::SPECIFICATION_TESTER_ID.'.example.event_dispatcher', $definition);

        $definition = new Definition('Funk\Tester\ExampleTester\DefaultTester', [
            new Reference(EnvironmentExtension::MANAGER_ID),
            new Reference(CallExtension::CALL_CENTER_ID),
        ]);
        $container->setDefinition(self::SPECIFICATION_TESTER_ID.'.example.default', $definition);

        $definition = new Definition('Funk\Specification\Locator\Spec', [
            '%paths.base%',
        ]);
        $definition->addTag(SpecificationExtension::LOCATOR_TAG);
        $container->setDefinition(self::SPEC_LOCATOR_ID, $definition);
    }

    // ...
}
{% endhighlight %}

<div markdown="1" class="edit">
It can look a bit raw at a first glance, but see how this class is just declaring some services. It's just glue.  
I don't know if it's feasible, but IMHO nothing prevents you from using the symfony DI yaml loader if you wish.
</div>

### Looping

As stated above, you'll have to define a specification locator and iterator, just to tell TestWork how to find your use cases.  
In this case, we're iterating the filesystem hierarchy, searching for php files.  
Each of these files might declare classes that implement `Funk\Spec` and containing `it_` methods.

{% highlight php %}
<?php

class Spec implements SpecificationLocator
{
    public function locateSpecifications(Suite $suite, $locator)
    {
        $iterator = $this->getFilesIterator($locator);

        return new Iterator($suite, $iterator, $this->basePath);
    }

    private function getFilesIterator($locator)
    {
        $path = $this->findAbsolutePath($locator);
        if (!is_dir($path)) {
            return new \ArrayIterator([new \SplFileInfo($path)]);
        }

        return new \RegexIterator(
            new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($path)
            ), '/^.+\.php$/i',
            \RegexIterator::MATCH
        );
    }

    // ...
}
{% endhighlight %}

{% highlight php %}

<?php
class Example extends \ArrayIterator implements SpecificationIterator
{
    private function getMethods(Spec $spec)
    {
        $reflection = $spec->getReflection();
        $result = [];
        $methods = $reflection->getMethods(\ReflectionMethod::IS_PUBLIC ^ \ReflectionMethod::IS_ABSTRACT);
        foreach ($methods as $method) {
            if (0 !== strpos($method->getName(), 'it_')) {
                continue;
            }
            $result[] = new InvokableMethod($method);
        }

        return $result;
    }

    // ...
}
{% endhighlight %}

Once you implemented them, TestWork will simply start to work for you :)

The other important concept to tackle is the `CallCenter` and `Call`s.  

### Call me maybe?

The main interest of this is to delegate the execution of userland code (i.e the tests) to a call center.  
This way, it will be able to automatically handle exceptions, return status, and wrap the result with interesting extra information contained in a `CallResult`.

TestWork makes it so that everything that is callable by the CallCenter can be taken into account in the final result.

  * In Behat, the callee is the Context method associated to a step
  * In funk-spec, it's the `it_` method describing an example
  * In PhpSpec, it would be the `it_` method describing an example too (but it's not yet[^1] using TestWork)


In funk-spec, a callable is created using the reflection of the spec class.

{% highlight php %}
<?php

class InvokableMethod implements Callee
{
    private $method;
    private $description;

    public function __construct(\ReflectionMethod $method, $description = null)
    {
        $this->method = $method;
        $this->description = $description;
    }

    public function getCallable()
    {
        return $this->method;
    }

    // ...
}
{% endhighlight %}

Last but not least, it's important to note that `Callee`s are just references to something that is not executable per se.  
It's just a lightweight **representation** of something that could be called!

In order to really execute the case, you can take advantages of another concept in TestWork: `Environment` and `EnvironmentHandler`.


### Environment (this is not about global warming)

`Environment` implementations are something that helps instantiating the use case.  
They make the callee callable (huh don't ask me, idk) and the result will be passed to an handler.


{% highlight php %}
<?php

class Spec implements Environment
{
    private $suite;
    private $spec;

    public function __construct(Suite $suite, Funk\Spec $spec = null)
    {
        $this->suite = $suite;
        $this->spec = $spec;
    }

    public function getSuite()
    {
        return $this->suite;
    }

    public function bindCallee(Callee $callee)
    {
        $callable = $callee->getCallable();

        if ($callee->isAnInstanceMethod()) {
            return [$this->spec, $callable->getName()];
        }

        return $callable;
    }
}

{% endhighlight %}


The handler is responsible for isolating the use case.  It's the one that instantiate the corresponding spec class, and calls the corresponding method. Isolation is an important part of testing, and that's the role of handlers. The same use case could be called in many different contexts and suites.

{% highlight php %}
<?php

class Spec implements EnvironmentHandler
{
    private $initializers = [];

    public function registerInitializer(SpecInitializer $initializer)
    {
        $this->initializers[] = $initializer;
    }

    public function supportsSuite(Suite $suite)
    {
        return true;
    }

    public function buildEnvironment(Suite $suite)
    {
        return new SpecEnvironment($suite);
    }

    public function supportsEnvironmentAndSubject(Environment $environment, $testSubject = null)
    {
        return $environment instanceof SpecEnvironment;
    }

    public function isolateEnvironment(Environment $environment, $method = null)
    {
        $instance = $this->createInstance($method);
        $environment = new SpecEnvironment($environment->getSuite(), $instance);

        return $environment;
    }

    public function createInstance(InvokableMethod $method)
    {
        $instance = $method->getReflection()->getDeclaringClass()->newInstance();

        foreach ($this->initializers as $initializer) {
            $initializer->initializeSpec($instance);
        }

        return $instance;
    }
}

{% endhighlight %}

As you can see, a new instance is created for each use case. Some implementations can take this opportunity to call `Initializer`s on each instance, a concept specific to each testing tool, that you can retrieve in Behat/MinkExtension too.

## Conclusion

This small introduction was only the beginning, and we didn't see how to handle outputs, one of the most funny and colorful part of it :)


#### *Notes*:
[^1]: *Will it one day ? see [https://twitter.com/CiaranMcNulty/status/418670226637873152](https://twitter.com/CiaranMcNulty/status/418670226637873152)*



*[DIC]: Dependency Injection Container
*[CLI]: Command Line Interface
*[SRP]: Single Responsibility Principle
