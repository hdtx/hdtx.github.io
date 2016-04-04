---
layout: post
title: 'Fenwick trees: prefix sums in O(log N) time'
link_photo: fenwick-trees.png
og_image: fenwick-trees-fb2.png
comments: true
description: Understand and visualize a data structure for fast prefix sum updates and lookups
---

<script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.5.3/angular.min.js"></script>
<script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.5.3/angular-animate.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js"></script>
<script src="{{site.dir.pub}}/fenwick-trees/main.js"></script>
<link rel="stylesheet" href="{{site.dir.pub}}/fenwick-trees/main.css">

### The prefix sum

Suppose we have an array _f_ with _N_ values. Each subarray beginning at the start of _f_ is called a _prefix_ of _f_. So

    [f[0]]
    [f[0], f[1]]
    [f[0], f[1], f[2]]
    ...
    [f[0], f[1], f[2], ..., f[N - 2], f[N - 1]]

are all prefixes of _f_.

We want to calculate a new array _F_, also of size _N_, in which

    F[0] = f[0]
    F[1] = f[0] + f[1]
    F[2] = f[0] + f[1] + f[2]
    ...
    F[N - 1] = f[0] + f[1] + ... + f[N - 2] + f[N - 1]
    
That is, each element in _F_ is the sum over the corresponding prefix of _f_. We will say that _F_ is a __prefix sum__ of _f_. Prefix sums are useful in many ways; look at the [wikipedia page][WikiPrefix] to get an idea.

#### Calculation

An obvious "brute force" way of doing a lookup on the *i*th prefix sum _F[i]_ is to sequentially accumulate the values in _f_, from _f[0]_ to _f[i]_. This clearly has a time complexity of _O(N)_. An update to the data, on the other hand, is constant time -- the only access made is to the element to be changed itself. This suits an application which is update-heavy: if the data is to change often but the prefix sum will be rarely needed, our scheme looks OK.

Let's now suppose our application is lookup-heavy. Is there a way to improve on this? A fairly straightforward way to do so is to store the prefix sum array itself, _F_. This gives us lookup in _O(1)_ -- but now, of course, updates take linear time because to modify the *i*th element we have to update all elements from _F[i]_ to _F[N - 1]_. Incidentally, getting any one element in _f_ is still _O(1)_, but is not so simple anymore: we have to do `f[i] = F[i] - F[i-1]` if `i != 0`.

### Fenwick trees - the _O(log N)_ way

Fenwick trees (also called _binary indexing trees_) offer a middle ground solution for applications which are both update- and lookup-intensive: both operations have a _O(log N)_ time complexity. Moreover, the supporting structure is still a simple array, and all the "tree" magic is actually in the indexing process -- a bit akin to how heaps are normally implemented on top of regular arrays.

#### Theory

As said above, the tree topology manifests itself in the _process_ of indexing, not intrinsically in the stored data itself (the supporting array). This theoretically makes it possible to have many different trees with the same elements, only changing the way they are interconnected.

<svg width="100%" height="200">
  <line class="tree nline" x1="12.5%" y1="75%" x2="25%"   y2="25%"/>
  <line class="tree nline" x1="37.5%" y1="75%" x2="25%"   y2="25%"/>
  <line class="tree nline" x1="75%"   y1="50%" x2="62.5%" y2="25%"/>
  <line class="tree nline" x1="87.5%" y1="75%" x2="75%"   y2="50%"/>
  <circle class="tree ncircle" r="18" cx="25%"   cy="25%"/>
  <circle class="tree ncircle" r="18" cx="12.5%" cy="75%"/>
  <circle class="tree ncircle" r="18" cx="37.5%" cy="75%"/>
  <circle class="tree ncircle" r="18" cx="62.5%" cy="25%"/>
  <circle class="tree ncircle" r="18" cx="75%"   cy="50%"/>
  <circle class="tree ncircle" r="18" cx="87.5%" cy="75%"/>
  <text class="tree ntext" x="25%"   y="25%">0</text>
  <text class="tree ntext" x="12.5%" y="75%">1</text>
  <text class="tree ntext" x="37.5%" y="75%">2</text>
  <text class="tree ntext" x="62.5%" y="25%">0</text>
  <text class="tree ntext" x="75%"   y="50%">1</text>
  <text class="tree ntext" x="87.5%" y="75%">2</text>
</svg>

<span class="caption">Obligatory obvious example of differently connected trees containing the same elements</span>

This is so true that what we call a "Fenwick tree" is actually _two_ different trees, one for updating and a different one for prefix sum lookup.

#### The lookup tree

Before commenting on how the lookup works, I'll just throw an example C++ implementation at you. Here `v` is our supporting array.

{% highlight C++ %}
int pref_sum(size_t i, const vector<int> &v) {
    int sum = v[0];
    while (i != 0) {
        sum += v[i];
        i &= i - 1;
    }
    return sum;
}
{% endhighlight %}

What is happening here? There is a running sum going on, but the indexed elements vary in a strange-looking way. The crux of the whole thing is the bitwise operation `i AND (i - 1)`. Example:

      i     -> 424 (110101000)
    & i - 1 -> 423 (110100111)
             = 416 (110100000)

In this case, _i_ got decremented by 8. The more observant among you has already noticed that 8 also corresponds to the _lowest set bit in i_. This is not a coincidence: a decrement only affects the lowest set bit and the ones below it (if any), complementing them in relation to the original number and therefore zeroing them out in the AND result. But any bit below the lowest one set was already zero, therefore this operation only changes the lowest set bit.

TL;DR: for a non-negative _i_, this operation will always **clear the lowest set bit in _i_**.

In each loop iteration, _i_ has its least significant set bit cleared. But _i_, indexing _N_ elements, has at most _log<sub>2</sub>N_ bits to be cleared before the loop exits on the condition `i != 0`. Therefore, the _O(log N)_ time complexity on the update is established.

But how does this actually retrieve the prefix sum? Let's try to reason our way through this by taking notice of a few important facts:

* `v` cannot contain the same elements as our original element array _f_, not even in a different order, because we sum just _log i_ elements and get what is effectively the sum of _i_ elements. Therefore each of the elements in `v` must be composed of _the sum of a few certain elements_ from _f_.
* As _i_ only decreases during the lookup process, to get the *i*th prefix sum we can't look any further than `v[i]`. Therefore, _f[i]_ has to be part of the sum stored in some `v[j], i <= j`.
* Combining both points above, it stands to reason that some elements in _f_ will compose the sum of _more than one_ element in `v`.

Simulating the indexing scheme for an initial `i = 14` (notice the progression of the least significant set bit):

    14 (1110) =>
    12 (1100) =>
    8  (1000) =>
    0         (end)

Therefore, `F[14] = v[14] + v[12] + v[8] + v[0]`. But we know the 14th prefix sum must also equal `F[14] = f[14] + f[13] + ... + f[1] + f[0]`. A reasonable way of establishing the values of `v` which fits together with our previous conjectures would be the following guess:

    v[14] = f[14] + f[13]
    v[12] = f[12] + f[11] + f[10] + f[9]
    v[8]  = f[8] + f[7] + f[6] + f[5] + f[4] + f[3] + f[2] + f[1]
    v[0]  = f[0]

And -- surprise, surprise -- this is actually the right scheme. Consider how the sequence changes when the starting index _i_ is progressively smaller, from 14 down to 0:

    14 => 12 => 8 => 0   [14-13] + [12-9] + [8-1] + [0]
    13 => 12 => 8 => 0      [13] + [12-9] + [8-1] + [0]
    12       => 8 => 0             [12-9] + [8-1] + [0]
    11 => 10 => 8 => 0      [11] + [10-9] + [8-1] + [0]
    10       => 8 => 0             [10-9] + [8-1] + [0]
    9        => 8 => 0                [9] + [8-1] + [0]
    8             => 0                      [8-1] + [0]
    7  =>  6 => 4 => 0        [7] + [6-5] + [4-1] + [0]
    6        => 4 => 0              [6-5] + [4-1] + [0]
    5        => 4 => 0                [5] + [4-1] + [0]
    4             => 0                      [4-1] + [0]
    3        => 2 => 0                [3] + [2-1] + [0]
    2             => 0                      [2-1] + [0]
    1             => 0                        [1] + [0]
    0                                               [0]

To the left is the indexing sequence for a given starting _i_, and to the right is the corresponding sum in terms of intervals (for example, `[8-1]` means the element 8 accumulates all items from 8 down to 1, inclusive). Now, I don't mean to explain to you how Prof. Fenwick got the idea for this indexing scheme -- in his [paper][Paper] he does not really make his thought process clear --, but my ambition is to show you the scheme is consistent with what it claims to do. You may work through the example to see that, given the indexing sequences in the left, the intervals in the right are the only ones that give the correct prefix sums.

The paths from starting index _i_ all the way to 0 can be better understood when visualized in a tree structure, with 0 at the root (more on that in a minute). That's what we call the _lookup tree_: the topology the index _i_ follows when we are retrieving a prefix sum from the data structure.

#### The update tree

As before, instead of first explaining anything I'll just whack you in the head with an example implementation for the update operation:

{% highlight C++ %}
void add(size_t i, vector<int> &v, const int k) {
    if (i == 0)
        v[i] += k;
    else
        while (i < v.size()) {
            v[i] += k;
            i += i & ~(i - 1);
        }
}
{% endhighlight %}

The first thing to be noticed is that `i == 0` is treated as a special case. This is required because the index update inside the `while` does not do anything when `i = 0`.

Speaking of which, we have yet again another loop with a weird index update bitwise operation. This time though, we are inverting all the bits on _i_ after decrementing it. Remember that, as seen previously, decrementing a number inverts the lowest set bit and all the ones below it, leaving the upper ones untouched. However, if we now invert the number, the lowest set bit comes back to normal again, while the upper bits are inverted and the lower ones are set back to zero (as in the original number). If we bitwise AND this with the original number, we **isolate the lowest set bit**. And that's the index update operation: you're incrementing the number with its lowest set bit. 

(Note: it's very common for implementations to use `i += i & -i` instead, relying on [two's complement][Wiki2c] representation for negative binary numbers.)

This looks nicely dualistic to the index update in the lookup tree, doesn't it? In the lookup tree we were effectively decrementing the number by its lowest set bit; now we're incrementing it by the same amount. Let's look at how a starting index of 1 evolves in this case (considering we have 15 elements):

    1  (00001)
    2  (00010)
    4  (00100)
    8  (01000)
    16 (10000) => larger than v.size() == 15, breaking out of the loop

If you now take a look back at the lookup tree example, you will see that the elements which accumulate _f[1]_ are `v[1], v[2], v[4], v[8]` -- exactly the ones which were indexed during the update operation.

The _update tree_ is, in some respects, a [dual opposite][Bizarro] to the _lookup tree_: two nodes which have an order relation (there is a path from <em>n<sub>2</sub></em> to <em>n<sub>1</sub></em>, so <em>n<sub>2</sub></em> is located in the subtree rooted at <em>n<sub>1</sub></em>) in one tree will not have an order relation in the other, and vice-versa.

Again, we can establish the time complexity of this operation as _O(log N)_ by following the indexing logic. It's easy to see that, by adding a number's lowest set bit to itself, this bit will be set to zero and a higher bit will become the new lowest set bit. We have a maximum of _log<sub>2</sub>N_ bits to go by before the loop ends, therefore the number of operations can't be higher than _log<sub>2</sub>N_.

### Visualization

* Mouse over tree nodes to see which elements in _f_ are accumulated under the element in `v`. To assure yourself that some element's prefix sum really accumulates all of its prefix components, you can mouse over the element on the lookup tree and follow the way up to the root with the mouse. You'll notice all of the prefix components lighting up at some point.
* The update tree shows nonexistent nodes (hatched) to illustrate all elements under a single tree. These fictitious nodes are useless in prefix sum applications, but are important in related techniques such as [arithmetic coding][Witten].

<span ng-app="fenwickTreesApp" ng-controller="fenwickTreesCtrl"><trees /></span>

On a closing note: we covered Fenwick trees for prefix _sums_, but the general notion can be applied to other operations -- any associative binary operation will work (it doesn't even have to be transitive, if you take a bit of care with the code).

### References

* [A New Data Structure for Cumulative Frequency Tables (1994)][Paper] -- Peter Fenwick's original paper
* [Arithmetic Coding for Data Compression (1987)][Witten] -- Paper on a related technique
* [Illustrative answer on Stack Exchange][SX]
* [Wikipedia article on Fenwick trees][Wiki]

[SX]: http://cs.stackexchange.com/a/10541/48627
[Paper]: http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.14.8917
[Wiki]: https://en.wikipedia.org/wiki/Fenwick_tree
[Witten]: http://web.stanford.edu/class/ee398a/handouts/papers/WittenACM87ArithmCoding.pdf
[WikiPrefix]: https://en.wikipedia.org/wiki/Prefix_sum
[Wiki2c]: https://en.wikipedia.org/wiki/Two%27s_complement
[Bizarro]: https://en.wikipedia.org/wiki/Bizarro_World