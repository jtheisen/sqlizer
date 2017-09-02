# Teaser

Imagine the following JavaScript would translate into SQL and fetch the
respective data - while even being type safe when using TypeScript:

```
```

Under TypeScript, the type of `result` is even inferred from the query
as this query doesn't select a predefined model type.

# Abstract

I currently do server-side work with .NET and so I'm used to using LINQ to query
databases. In case you don't know what that is: It's a combination of language
and library constructs on .NET that allow you to write compact, expressive and
type-safe queries against various data sources, the most important of which are
of course SQL databases. For those, LINQ is translated to SQL at runtime.

There's more than one ORM that can be used with LINQ to query SQL databases,
but I'm mostly familiar with Microsoft's Entity Framework.

.NET is a damn good platform, but like most people, I've come to make my peace
with the fact that there's no way around doing a lot of JavaScript, too. And
when clients are written in JavaScript anyway, it stands to reason to consider
ditching .NET altogether and go with Node.js in order to benefit from shared
code and a shared data model.

The one thing that keeps me from going this route for new applications is the
fact that there is really nothing in JavaScript (or any non-.NET language for
that matter) that plays in LINQ/Entity Frameworks league.

I want at least:

* Type-safety when using TypeScript (on the *data model*, not just the ORM's API)
* Queries should look elegant and be easily comprehensible
  (especially joins and infix operators make our lives difficult without special
  language support)
* Arbitrary result set types, not just sets of predefined model types
  (sometimes called "projections") as shown in the teaser; we can live with
  not being able to write back rows fetched that way
* The resulting SQL should be somewhat readable for the sake of the debugging
  that will be necessary on occasion. For the same reason, it is beneficial
  when the structure of the Lonq query is still recognizable in the resulting SQL.

I've written the beginning of a query builder that could be used as research
for a something more serious in the future.

# Queries in JavaScript and TypeScript

## Fluent expressions

"Fluent" is a popular API paradigm often used for set comprehensions, among
other things. Underscore/Lodash uses it, so it's what people expect.

    const newSet = someSet
        .where(p => p.age.gt(18))
        .map(p => p.age)
        .take(10)

Whereas Underscore/Lodash transforms arrays in each step, LONQ builds
an expression tree from which later the SQL can be rendered.

### Sets

The type of someSet would be something like `LonqSet<Person>`, where `Person`
is a user-defined entity type. The resulting `newSet` is correctly inferred
to have the type `LonqSet<number>`.

Such `LonqSet`s have an `expression` property that contains the expression it represents.
For example, `someSet` could have a `NamedSetExpression` that represents
a table/entity in the database. Then `someSet.Where(p => p.age.gt(18))`'s
expression would be a `QueriedSetExpression` which refers to the former
`NamedSetExpression`.

### Elements

The expression trees for the arguments of `where` and `map` are build by
LONQ by executing the respective lambdas with `p` being a `LonqElement<Person>`.
That, again, has an `expression` property and is build in an analogous manner.

A key difference between `LonqSet`s and `LonqElement`s is that the latter
need to have properties coming from the user-defined entity models, such
as `p.age` - both as a TypeScript type and at as a JavaScript object at runtime.

Note that obviously `p` can't just be a simple instance of `Person` as we need
`p.age` to represent something containing an `expression` property.

To make this work at runtime, the lambdas of `map` and `where` are called with
mock objects that have all the properties of the user's model but instead
of returning actual values, they return again `LonqElement`s with the
`expression` property containing a `MemberExpression` which then ultimately
becomes part of the query's whole expression tree.

The mock object also contains a number of methods for fluently writing
operator calls such as `gt` (greater than).

To make this work at compile time in TypeScript, the user model types are
recursively [mapped](https://www.typescriptlang.org/docs/handbook/advanced-types.html)
to `LonqElement`s. So for example, if you have a `LonqSet<Person>`
then the `p` in the lambdas becomes `LonqElement<Perons>` and `p.age`
becomes `LonqElement<number>`.

The element types being `LonqElement`s is also an important safeguard
against the user accidently calling a function that, for example, expects
a real `Person` entity rather than meaning to contribute to an expression.

## Pseudo-monadic expressions

There's one thing where a pure fluent approach becomes extremely awkward: Joins.

LINQ offers a special so-called "query syntax" as a way to express them
conveniently like this:

    from o in Orders
    from i in o.Invoices
    select new { o, i }

This is semantically equivalent to the following in LINQ's so-called
"method syntax":

    Orders.SelectMany(o => o.Invoices, (o, i) => new { o, i })

That's certainly something that could be done in JavaScript, but it's very
confusing - which is of course why the LINQ query syntax was created.

The problem here is that we want an expression syntax that allows us to
introduce new symbols `o` and `i` within the expression. Some functional
languages such as Haskell allow that with support for something call
a *monad*.

JavaScript has neither monads nor a LINQ query syntax, but I would like to suggest
a workaround that would work in any language: the *pseudo-monadic expression*:

    query(() => {
        const o = from(orders);
        const i = from(o.invoices)

        return { o, i };
    })

It's certainly very readable.

The way this works is that the query function sets up a context in which
to evaluate the given lambda. That context contains a mutable structure
representing the subquery that is going to be build. The lambda is
then called and certain functions such as `from` register a new join
factor on the query in the context and returns 

### Elements can be sets

One tricky bit regarding elements is that sometimes they are themselves sets.
In the last code snippet, `o.invoices` can be used as an argument to `from`,
although it is really a `SqlElement` and not a `SqlSet`. It can still be
used with proper type inferrence as long as the type is an array type.

On proper `SqlSet`s, however, we the fluent methods mentioned earlier, which
are of course missing in `SqlElement`. It would be possible to insert
them at runtime for only those `SqlElement`s that are in fact sets, but
there's no way to express that in TypeScript's type system.

We certainly don't want all the fluent methods on *all* elements as normal,
non-set elements have all the user-defined model properties the fluent
methods could collide with.

LINQ gets around this with
[extension methods](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/extension-methods),
which aren't available in JavaScript.

So the best I can think of is to put *one* fluent method in *all* elements
that gives us the `SqlElement` as a `SqlSet`:

    .where(o => i.invoices.asSet().any())

Query building would throw an exception on calling this method on non-array
elements:

    .where(o => i.any())   // compiles but throws at query build time

### Named elements

One annoying limitation of SQL is the lack of element variables. This
forces one to repeat the same expression twice:

    SELECT TRIM(untrimmed)
    FROM someTable
    ORDERBY TRIM(untrimmed)

If the expression was more complex than `TRIM(untrimmed)` you can see how that's
cumbersome. You can work around that by doing a subquery, but that's argueably
even more convoluted. In LINQ it's just

    from r in someTable
    let trimmed = r.untrimmed.Trim()
    orderby trimmed
    select trimmed

TODO

# The right level of abstraction

Nobody wants to write SQL itself, even if it was type-safe and would integrate
nicely into a host language like JavaScript. One wants at least *some*
abstraction on top of that, the most common for ORMs being implict joins
through navigational properties. On the other hand, it shouldn't be entirely
mystical how the SQL is being generated.

## We want to query graphs, not tables

Another common thing is that ORM query results are technically graphs (with
relationships being the edges), whereas SQL results are usually flat tables.
Sql Server for can indeed return subgraphs (or rather subtrees, but
that's close enough) by returning XML or JSON, but I don't know to what extent
that's common in other database servers.


## Named subqueries

In LINQ you can write

    var orders = Orders.Where(o => !o.IsDeleted);
    var result = orders.Select(o => o.CreatedBy).Union(orders.Select(o => o.LastModifiedBy))

giving you all people involved with non-deleted orders. The "non-deleted" set of
orders is factored out here, something that in SQL is called a *common table expression*
(CTE):

    WITH orders AS (
        SELECT o.* FROM Orders o WHERE o.IsDeleted = 0
    )
    SELECT o.CreatedBy FROM orders o
    UNION
    SELECT o.LastModifiedBy FROM orders o

Entity Framework doesn't actually seem to translate into CTEs but puts in multiple
copies of the same query.

I think it really should use CTEs, because it makes the resulting SQL more readable.

## CROSS APPLYs: Cleaning up annoying join restriction in SQL

On writing this experiment I've learned that there is at least one more abtraction
that one really wants to have. Consider this LINQ query:

    from o in Orders
    from i in (from i2 in Invoices where i2.OrderNo == o.OrderNo select i2).Take(1)
    select new { o, i }

A second from is normally simply a cross join, but in this case the subquery
from depends itself on `o`, the "alias" of the first join factor.

That's not possible in SQL: Joined subqueries can't reference aliases of sibling
joins - that's why there is the separate on-clause where you *are* allowed to reference
the aliases of all join factors. This is a somewhat arbitrary restricting that is
motivated by the fact that in general such an arbitrary dependencies would force
a join order.

Sometimes, however, they are necessary and a forced the join order is acceptable.
Above LINQ query gets translated to this in Sql Server:

    SELECT 
        ...
        FROM  [dbo].[Orders] AS [Extent1]
        CROSS APPLY  (SELECT TOP (1) ...
            FROM [dbo].[Invoices] AS [Extent2]
            WHERE [Extent2].[OrderNo] = [Extent1].[OrderNo] ) AS [Limit1]

The `CROSS APPLY` is a rather young join type that allows the joined set to
be arbitrarily dependent on aliases of sibling joins. If the set isn't the
cross apply behaves like a cross join.

There also is an `OUTER APPLY` that behaves analogously to an outer join.

(The example only selects the first invoice for every order as when one would
select all invoices, the query could be expressed by a simple join again by
moving the subquery's where into an on-clause - and Entity Framework
does this kind of optimization.)

I could imaging that the cross apply was introduced precicely to make it
possible to have a nicer query language such as LINQ that does away with this
subtle bit of SQL weirdness - CROSS APPLY debuted in Sql Server 2005, LINQ in
Visual Studio 2008. It's now part of the SQL standard.

The feature is also supported by at least Oracle and PostgreSQL (for the
latter under the name *lateral join*).




