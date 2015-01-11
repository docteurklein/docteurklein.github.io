---
layout: post
title: Docker automated builds, dynamic Dockerfiles, and me
tldr:  How to auto-build different versions of a Dockerfile
tags: docker auto-build dynamic Dockerfile

---

There are two, totally non-compatible, ways to declare a repository on the docker hub.

The first is the "normal" approach. Give it a name and push and pull arbitrary contents to it.  
The second one is the "automated build" approach.

## Automate, but nope.

There are advantages to auto build.

First, it's the **only** way to bind a github repository to a hub repository.
When you know the number of people who ask for the sources of your image, I can tell you it's important :)

It synchronizes your README with the displayed description.

It watches on github pushes. You can chose to watch a list of specific branches and/or tags, and it will build and tag a new image for each push.
Now you save CPU time on your machine, and you build in the cloud[^1]!

Auto-builds are more trusted, up-to-date, and a sign of quality and active maintenance[^2].

## It's FATA

But there is a massive, FATA (not fatal, it would be too long :)) drawback:

    docker push docteurklein/sqitch:pgsql

    The push refers to a repository [docteurklein/sqitch] (len: 1)
    Sending image list
    FATA[0001] Error: Status 403 trying to push repository docteurklein/sqitch: "Access denied, you don't have access to this repo"

How dare you ? It's mine!

Indeed, docker hub won't allow you to push to this repo anymore.
Instead, you have to manually create a github tag/branch, push it, and configure your repo to react to this specific tag/branch.

Now that's what I call automated![^3]

## Dynamic Dockerfile

Again something docker does not allow. Well, [not everywhere](http://docs.docker.com/reference/builder/#environment-replacement).  
If you want dynamic Dockerfiles, you need a templating system with variable interpolation. Or bash.

A simple way to make your Dockerfile dynamic is to use `docker build -`, which reads from stdin, plus bash's `eval`.

    driver=Pg eval "echo \"$(<Dockerfile)\"" 2> /dev/null | docker build -

With the corresponding Dockerfile:

{% highlight bash %}
FROM perl:latest
RUN cpan App::Sqitch
RUN cpan DBD::$driver
VOLUME ["/src"]
WORKDIR /src
ENTRYPOINT ["sqitch"]
{% endhighlight %}

<div markdown="1" class="edit">
Note the `$driver` variable that will be replaced with the corresponding environment variable (`Pg` in that case).
</div>

## Enter the Makefile

What's cool with docker is that we re-do what unix people do for 20 years, but the bloated way :) [^3][^4]

But it also says we re-use cool tools, like Makefiles.

In fact, nothing forces you to use a Makefile, it's just a convenient way to remember and persist looooooong commands,
a thing you end up to do quite often with docker[^3].

## Put it all together

Now we have dynamic Dockerfiles, we just need to push it to github and the hub will automatically build it and tag it for us.

It requires a small git trick, that I also put in my Makefile:

{% highlight Makefile %}
push:
    git checkout -b $(tag)
    driver=$(driver) eval "echo \"$$(<Dockerfile)\"" 2> /dev/null > Dockerfile
    git commit -am"auto-build $(tag)"
    git tag -f $(tag) `git rev-parse HEAD`
    git checkout -
    git branch -D $(tag)
    git push origin $(tag)
{% endhighlight %}

Now, just execute it like that:

    driver=Pg tag=pgsql make push

And make sure you configured this tag to auto-build in your [hub's repository settings.](http://docs.docker.com/docker-hub/builds/)

## Conclusion

This method has been used successfully on [docteurklein/firefox](https://registry.hub.docker.com/u/docteurklein/firefox/)
and [docteurklein/sqitch](https://registry.hub.docker.com/u/docteurklein/sqitch/) for the moment.

It seems to work, and I'm curious to have your feedback!

#### *Notes*
[^1]: *Or is it in [my butt](https://github.com/panicsteve/cloud-to-butt) ?*
[^2]: *oh la, jolly jumper*
[^3]: *pun intended.*
[^4]: *troll intended.*
