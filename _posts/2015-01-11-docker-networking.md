---
layout: post
title: docker container IPs and varnish ACL
tldr:  How to resolve IRL problems developers encounter with docker networking
tags: docker networking varnish ACL

---

## The use case

I'm developing an HTTP web service.

{% highlight bash %}
server:
  image: python:2
  ports:
      - 5020:80

{% endhighlight bash %}

It is slow.
As a lazy, bad person, I answer: «cache!».

## Easy peasy


{% highlight bash %}

varnish:
  image: million12/varnish
  volumes:
    - docker-compose/varnish/config.vcl:/etc/varnish/default.vcl
  links:
   - server
  ports:
      - 5020:80

server:
  image: python:2

{% endhighlight bash %}

## Done alreadyyy

That's it. That's really it. Goodbye.

Ho but I forgot, we don't live in hello's world.  
What if we need varnish ACL?  
They often are based on IP addresses.

## Container IPs

The default behavior of docker concerning container IP allocation is [well described](http://docs.docker.com/articles/networking/#docker0).

`--bip` accepts an address [cidr](https://tools.ietf.org/html/rfc1918). 

It will define the address of the `docker0` bridge (that is, the address that containers will see when the world communicates with it).

`--fixed-cidr` is also a cidr range, that must be subset of the `bip` defined above.

Each container will be assigned an IP in that range only.

By default (if non of these options is passed), docker seems to default to:

    --bip=172.17.42.1/16

## The problem (if any)

Now the bridge IP and the containers IPs all match the same mask.  
**You can't know if a packet comes from the outer world or from a container.**

Well, in fact you can, the outer world will always be `172.17.42.1` in that case.

## The solution(s)

You could separate the bridge IP from the container ones, by declaring a subset:

    --bip=172.16.0.1/16 --fixed-cidr=172.16.1.0/24

This way, the `172.16.1.0/24` cidr will only match container IPs!


Now, varnish can safely refuse anyone coming from the outer world:

{% highlight bash %}

acl allowed {
    "172.16.1.0/24";
}

sub vcl_recv {
    if (req.method == "PURGE") {
        if (client.ip ~ allowed) {
            return(purge);
        }
        return(synth(403, "Access denied."));
    }
}

{% endhighlight bash %}

## What we learn

Docker shows us yet another side of its complexity :D

More seriously, a simpler approach could simply to use a blacklist ACL, or a combination of both:

{% highlight bash %}

acl refused {
    "172.17.42.1";
}

sub vcl_recv {
    if (req.method == "PURGE") {
        if (client.ip !~ refused) {
            return(purge);
        }
        return(synth(403, "Access denied."));
    }
}

{% endhighlight bash %}

*[IRL]: In Real Life
*[ACL]: Access Control List
*[IP]: Internet Protocol
