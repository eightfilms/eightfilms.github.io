title: Shamir's Secret Sharing
date: 2024-06-16
---

Curiosity led me to study about [Multi-Party Computation](https://en.wikipedia.org/wiki/Secure_multi-party_computation) (or MPC), so I implemented a [simple
Shamir's Secret Sharing scheme in Zig](https://github.com/eightfilms/shamir-zig).

# Overview

Given a secret `s`, we can share this secret `s` amongst `n` parties such that the
secret `s` can be easily reconstructed by any `t` + 1 parties, where `t <= n`.

The only restriction on $\mathbb{F}$ is that $\mathbb{F} > n$.

Other restrictions are that `t` must be less than or equal to `n`, and `t` must be more than 1.

Here is an overview of the algorithms to share and reconstruct the secret:

**ShareSecret**:
1. Choose a random polynomial $f_s(X) \in \mathbb{F}[X]$ of degree at most $t$ such that $f_s(0) = s$.
2. Send privately to player $P_j$ the share $s_j = f_s(j)$.

**ReconstructSecret**:
1. Given `t + 1` shares of a degree `t` polynomial, reconstruct a function that hits all these points such that $f_s(0) = s$.
2. Evaluate the function at 0.

Easy, right?

Not quite for me, when working forwards. Most texts seem to jump straight into [Lagrange interpolation](https://en.wikipedia.org/wiki/Lagrange_polynomial) (why do we need this?). Things made sense when I looked at it from the reconstruction step first, with this [video](https://www.youtube.com/watch?v=kkMps3X_tEE). I'll briefly summarize what I learnt in text below.

# Reconstructing the secret

Working backwards, Assume that we receive 4 shares of a degree-3 polynomial in **ReconstructSecret** function:

$$
f(5) = 3,
f(7) = 2,
f(12) = 6,
f(30) = 15
$$

Recall from above that we want to reconstruct a function $f$ that hits all these points.
We know that there's only **one** polynomial of degree 3 that visits all 4 points, so if we can reconstruct $f$ from the shares, then $f(0)$ must be the **secret**!

So, let's prove that we can do just that.

We can't work out much with the current way the above shares (or evaluations) are expressed. Let's try to rewrite the above evaluations in terms of a small function, $\delta$:

$$
f = \delta_5(x) + \delta_7(x) + \delta_{12}(x) + \delta_{30}(x)
$$

where

<center>$\delta_5(x)$ = if $x == 5$ then $5$ else $0$</center>

<center>$\delta_7(x)$ = if $x == 7$ then $7$ else $0$</center>

<center>$\delta_{12}(x)$ = if $x == 12$ then $12$ else $0$</center>

<center>$\delta_{30}(x)$ = if $x == 30$ then $30$ else $0$</center>

Note that in the above we can simplify the result of $delta_i(x)$ even further due to the common if-else expression. Let's do that by making them return 1 if the condition holds:

<center>$\delta_5(x)$ = if $x == 5$ then $1$ else $0$</center>

<center>$\delta_7(x)$ = if $x == 7$ then $1$ else $0$</center>

<center>$\delta_{12}(x)$ = if $x == 12$ then $1$ else $0$</center>

<center>$\delta_{30}(x)$ = if $x == 30$ then $1$ else $0$</center>


Our function $f$ now looks like:

$$
f = 5\delta_5(x) + 7\delta_7(x) + 12\delta_{12}(x) + 30\delta_{30}(x)
$$

After we simplified the above, notice that we can generalize our $\delta$ function:

<center>$\delta_i(x)$ = if $x == i$ then $1$ else $0$</center>

# Rewriting in polynomial form

But the function is not a polynomial **yet**. Remember that our endgoal is to form a degree-3 polynomial to recover our secret.

Recall that given $i = 5$, it needs to be 0 for $x = 7, 12, 30$, and 1 if $x = i$, as we've defined in the if-else statements above. We can rewrite our $delta$ function to express this. Let's take $i = 5$ as an example:

<center>$\delta_5(x) = (x - 7)(x - 12)(x - 30)$</center>

We've fulfilled the first requirement, but it does not fulfill the requirement of evaluating to 1 when $x == i$ as we've defined in our if-else statements. We can simply divide the terms by $x - i$ to achieve that:


<center>$\delta_5(x) = \frac{(x - 7)}{(5 - 7)}\frac{(x - 12)}{(5 - 12)}\frac{(x - 30)}{(5 - 30)}$</center>

Note that when $x == 5$, the above equation evaluates to 1, but still evaluates to 0 for $x \neq 5$, and we've fulfilled both requirements!

We can generalize this $\delta$ function now:

$$
\delta_i(x) = \prod_{j \neq i}^{j \in C}\frac{(x - j)}{(i - j)} 
$$

where $C$ is the set of shares:

$$
C = \set{5, 7, 12, 30}
$$

And our $f$ now looks like:

$$
f(x) = \sum_{}^{i \in C} {f(i)\delta_i(x)}
$$

Notice that our $\delta$ function is exactly in the **Lagrange interpolation form**, and now it's obvious why we use it! Now we have all the ingredients we need to reconstruct our $f$ and reconstruct our secret $s$ from evaluating $f$ at $0$.

# Sharing the secret

Now that we've shown that we can reconstruct our secret with a threshold of `t+1` shares, it's simple to understand how we can share the secret now. We just need to choose a random polynomial of degree at most $t$ (so that `t+1` shares are necessary to reconstruct in the above manner), and send the evaluations (or shares) to the respective parties.
