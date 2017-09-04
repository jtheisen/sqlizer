# Teaser

Imagine the following JavaScript would translate into SQL and fetch the 
respective data - while even being type safe when using TypeScript: 

```
    var result = fetch(query(() => {
        var o = from(orders);
        var i = join(invoices).on(i => o.orderNo.eq(i.orderNo));

        return { o, i };
    }))

    if (result.length) console.info(`first order is: ${result[0].o.orderNo}`)
```

Under TypeScript, the type of `result` is indeed inferred from the query's
selection `{ o, i }` as this is obviously not some predefined model type.

This repo contains a proof of concept that this is possible.

# Motivation

I currently do server-side work with .NET and so I'm used to using LINQ to 
query databases. In case you don't know what that is: It's a combination of 
language and library constructs on .NET that allow you to write compact, 
expressive and type-safe queries against various data sources, the most 
important of which are of course SQL databases. For those, LINQ is translated 
to SQL at runtime. 

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

* Type-safety when using TypeScript (on the *data model* when building 
  queries, not just the ORM's API) 
* Queries should look elegant and be easily comprehensible (especially joins 
  and infix operators make our lives difficult without special language 
  support) 
* Arbitrary result set types, not just sets of predefined model types 
  (sometimes called "projections") as shown in the teaser; we can live with 
  not being able to write back rows fetched that way 
* The resulting SQL should be readable for the sake of the debugging 
  that will be necessary on occasion. For the same reason, it is beneficial 
  when the structure of the original query is still recognizable in the 
  resulting SQL. 

I've written the beginning of a query builder that could be used as research 
for a something more serious in the future. It's not usable yet in any way, 
but I think I got most of the tricky stuff working to prove that the type 
inference and runtime query building really works the way as I describe in 
this readme. I will call this *Sqlizer* to have  a name for it that isn't
again LINQ, which would be confusing in the context of this research. 

# Query building in JavaScript and TypeScript

## Fluent expressions

"Fluent" is a popular API paradigm often used for set comprehensions, among 
other things. [Underscore](http://underscorejs.org/)/[Lodash](https://lodash.com/) 
uses it, so JavaScript folk are used to it as much as anyone. 

    const newSet = someSet
        .where(p => p.age.gt(18))
        .map(p => p.age)
        .take(10)

Whereas Underscore/Lodash transforms arrays in each step, Sqlizer builds
an expression tree from which later the SQL can be rendered.

### Sets

The type of `someSet` would be something like `SqlSet<Person>`, where `Person`
is a user-defined entity type. The resulting `newSet` is correctly inferred
to have the type `SqlSet<number>`.

Such `SqlSet`s have an `expression` property that contains the expression it 
represents. For example, `someSet` could have a `NamedSetExpression` that 
represents a table/entity in the database. Then `someSet.Where(p => 
p.age.gt(18))`'s expression would be a `QueriedSetExpression` which refers to 
the former `NamedSetExpression`. 

### Elements

The expression trees for the arguments of `where` and `map` are build by
Sqlizer by executing the respective lambdas with `p` being a `SqlElement<Person>`.
That, again, has an `expression` property and is build in an analogous manner.

A key difference between `SqlSet`s and `SqlElement`s is that the latter
need to have properties coming from the user-defined entity models, such
as `p.age` - both as a TypeScript type and at as a JavaScript object at runtime.

Note that obviously `p` can't just be a simple instance of `Person` as we need
`p.age` to represent something containing an `expression` property.

To make this work at runtime, the lambdas of `map` and `where` are called with 
mock objects that have all the properties of the user's model; but instead of 
returning actual values, they return again `SqlElement`s with the 
`expression` property containing a `MemberExpression` which then ultimately 
becomes part of the query's whole expression tree.

The mock object also contains a number of methods for fluently writing
operator calls such as `gt` (greater than).

To make this work at compile time in TypeScript, the user model types are 
recursively [mapped](https://www.typescriptlang.org/docs/handbook/advanced-types.html) 
to `SqlElement`s. So for example, if you have a `SqlSet<Person>` then the 
`p` in the lambdas becomes `SqlElement<Person>` and `p.age` becomes 
`SqlElement<number>`. 

The element types being `SqlElement`s is also an important safeguard against 
the user accidently calling a function that, for example, expects a real 
`Person` entity rather than meaning to contribute to an expression. 

## Pseudo-monadic expressions

There's one thing where a pure fluent approach becomes very awkward: Joins. 

LINQ offers a special so-called ["query 
syntax"](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/concepts/linq/query-syntax-and-method-syntax-in-linq) 
as a way to express them conveniently like this: 

    from o in Orders
    from i in o.Invoices
    select new { o, i }

This is semantically equivalent to the following in LINQ's so-called
"method syntax":

    Orders.SelectMany(o => o.Invoices, (o, i) => new { o, i })

That's certainly something that could be done in JavaScript, but it's very
confusing - which is of course why the LINQ query syntax was created.

The problem here is that we want an expression syntax that allows us to
introduce new symbols (`o` and `i`) within the expression. Some functional
languages such as Haskell allow that with support for something call
a [*monad*](https://en.wikipedia.org/wiki/Monad_(functional_programming)).

JavaScript has neither monads nor a LINQ query syntax, but I would like to 
suggest a workaround that would work in any language: the *pseudo-monadic 
expression*: 

    query(() => {
        const o = from(orders);
        const i = from(o.invoices)

        where(not(o.isCancelled.eq(0)))

        return { o, i };
    })

It's certainly very readable.

The way this works is that the query function sets up a context in which to 
evaluate the given lambda. That context contains a mutable structure 
representing the subquery that is going to be build. The lambda is then called 
and certain functions such as `from` register a new join factor on the query 
in the context and returns a `SqlElement` with a `FromExpression` or 
`JoinExpression`.

### Each pseudo-monadic expression becomes a SQL query

I believe it's good to make these building blocks reflect exactly the
somewhat arbitrary SQL statement form:

    query(() => {
        const i = from(invoices)

        where(not(i.isCancelled))

        groupBy(i.orderNo)

        having(count().gt(0))

        orderBy(i.orderNo)

        return { orderNo: i.orderNo, count: count() }
    })

It makes for a strong relationship between the original query and
the resulting SQL.

### The case against compile-time safety fanaticism

An obvious objection against this construct is that a number of
programming errors will only be caught at query build time.

TypeScript can't check the order of `from`/`join`, `where`, `groupBy`, 
`having` and `orderBy` calls. If it's wrong, you will only learn about it at 
runtime from an exception. 

More subtly, it can also not be checked at compile time whether the selection 
only contains group key values or aggregates in cases where a `groupBy` is 
present. 

Still, I think it's an ideological argument. Let's remember what compile-time
safety is for: We want to catch those programming errors *that we wouldn't
catch anyway*.

This falls mostly in the latter category because

- on writing the query, we clearly test it manually once and
- after renamings or other model modifications, we haven't changed the order
  of above statements or changed anything regarding grouping semantics.

Those should cover most cases. Bugs will happen of course - but a different, 
more safe design would have other disadvantages that outweigh the safety 
benefits I believe. 

And there's one more advantage: Runtime exceptions can *explain* what the 
problem is (eg. "all joins must come before a where").

### Fluent combinators in terms of pseudo-monadic expression

The fluent methods shown earlier (`.where`, `.take`) can be implemented
in terms of the pseudo-monadic expression. That makes for some pretty
deeply nested queries though.

I still think the first proper implementation should do just that and
this could be improved on later, possibly by merging expressions in the
resulting expression tree.

### Elements can be sets

One tricky bit regarding elements is that sometimes they are themselves sets. 
In the last code snippet, `o.invoices` can be used as an argument to `from`, 
although it is really a `SqlElement` and not a `SqlSet`. It can still be 
used with proper type inference as long as the type is an array type. 

On proper `SqlSet`s, however, we have the fluent methods mentioned earlier, which 
are of course missing in `SqlElement`. It would be possible to insert them at 
runtime for only those `SqlElement`s that are in fact sets, but there's no 
way to express that in TypeScript's type system (yet).

We certainly don't want all the fluent methods on *all* elements: normal, 
non-set elements have all the user-defined model properties the fluent methods 
could collide with.

LINQ gets around this with [extension 
methods](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/extension-methods), 
which aren't available in JavaScript. 

The best I can think of is to put *one* fluent method in *all* elements 
that gives us the `SqlElement` as a `SqlSet`: 

    .where(o => i.invoices.asSet().any())

Query building would throw an exception on calling this method on non-array 
elements: 

    .where(o => i.asSet().any())   // compiles but throws at query build time

# The right level of abstraction

Nobody wants to write SQL itself, even if it was type-safe and would integrate 
nicely into a host language like JavaScript. One wants at least *some* 
abstraction on top of that, the most common for ORMs being implict joins 
through navigational properties.

On the other hand, it shouldn't be entirely mystical how the SQL is being 
generated and the resulting SQL should resemble the original query to make 
diagnostics easier: Analyzing an SQL statement's query plan is certainly not 
something unusual, and for that we want to understand the SQL that led to it. 

## We want to query graphs, not tables

ORM query results are technically graphs (with relationships being the edges), 
whereas SQL results are usually flat tables. Sql Server can indeed return 
subgraphs (or rather subtrees, but that's close enough) by returning XML or 
JSON, but I don't know to what extent that's common in other database servers. 

### Named elements

One annoying limitation of SQL is the lack of element variables. This
forces one to repeat the same expression twice:

    SELECT TRIM(untrimmed)
    FROM someTable
    ORDERBY TRIM(untrimmed)

If the expression was more complex than `TRIM(untrimmed)` you can see how 
that's cumbersome. You can work around that by doing a subquery, but that's 
argueably even more convoluted. In LINQ it's just 

    from r in someTable
    let trimmed = r.untrimmed.Trim()
    orderby trimmed
    select trimmed

In Sqlizer this would also be possible:

    query(() => {
        const r = from(someTable);
        const trimmed = trim(r.untrimmed);

        orderBy(trimmed)

        return { trimmed };
    })

## Named subqueries

In LINQ you can write

    var orders = Orders.Where(o => !o.IsDeleted);
    var result = orders.Select(o => o.CreatedBy)
        .Union(orders.Select(o => o.LastModifiedBy));

giving you all people involved with non-deleted orders. The "non-deleted" set 
of orders is factored out here, something that in SQL is called a *common 
table expression* (CTE): 

    WITH orders AS (
        SELECT o.* FROM Orders o WHERE o.IsDeleted = 0
    )
    SELECT o.CreatedBy FROM orders o
    UNION
    SELECT o.LastModifiedBy FROM orders o

Entity Framework doesn't actually seem to translate into CTEs but rather puts 
in multiple copies of the same query.

I think it really should use CTEs though, because

- it makes the resulting SQL more readable and
- it makes the resulting SQL reflect the structure of the original query.

## LINQ does too much

I will go into two abstractions I believe are a bad idea as

- it makes the resulting SQL look different from the original query and/or
- raises a wall between the query author and SQL concepts that are beneficial
  to know about.

### CROSS- AND OUTER APPLYs: Cleaning up annoying join restrictions in SQL

Consider this LINQ query: 

    from o in Orders
    from i in (from i2 in Invoices where i2.OrderNo == o.OrderNo select i2).Take(1)
    select new { o, i }

A second "from" is normally simply a cross join, but in this case the subquery 
from depends itself on `o`, the "alias" of the first join factor. 

That's not possible in SQL: Joined subqueries can't reference aliases of 
sibling joins - that's why there is the separate on-clause where you *are* 
allowed to reference the aliases of preceding join factors. This is a somewhat 
surprising restriction that is motivated by the fact that in general such 
arbitrary dependencies would force a join order. 

Frequently, however, they are necessary and a forced the join order is 
acceptable. Above LINQ query gets translated to this in Sql Server: 

    SELECT 
        ...
        FROM  [dbo].[Orders] AS [Extent1]
        CROSS APPLY  (SELECT TOP (1) ...
            FROM [dbo].[Invoices] AS [Extent2]
            WHERE [Extent2].[OrderNo] = [Extent1].[OrderNo] ) AS [Limit1]

The `CROSS APPLY` is a rather young join type that allows the joined set to be 
arbitrarily dependent on aliases of sibling joins. If the set isn't, the cross 
apply behaves like a cross join. 

There also is an `OUTER APPLY` that behaves analogously to an outer join. 

(The example only selects the first invoice for every order as when one would 
select all invoices, the query could be simplified to a simple join by moving 
the subquery's where clause predicate into an on-clause - and Entity Framework 
does this kind of optimization.) 

I could imaging that the cross apply was introduced precicely to make it 
possible to have a nicer query language such as LINQ that does away with this 
subtle bit of SQL weirdness - CROSS APPLY debuted in Sql Server 2005, LINQ in 
Visual Studio 2008. It's now part of the SQL standard. 

This important feature is also supported by at least Oracle and PostgreSQL 
(for the latter under the name *lateral join*). 

As for the abstraction, however, I would suggest staying closer to SQL with this 
syntax: 

    query(() => {
        const o = from(orders);
        const i = outerApply(query(() => {
            const i2 = from(o.invoices)
            where(i2.OrderNo.eq(o.OrderNo))
            fetchOnly(1)
            return i2
        }))

        return { o, i };
    })

I think it makes more sense to get programmers to learn more about SQL than to 
try and abstract away too much - in case of weird query execution problems, 
they need to understand the SQL anyway.

### `GroupBy` and `GroupJoin`

LINQ's grouping operator selects not only the grouping keys for each group
but also the group sets themselves - you can write something like this:

    from i in invoices
    group i by i.OrderNo into invoicesForOrder
    select new {
        OrderNo = invoicesForOrder.Key,
        LatestInvoiceNo = (
            from i2 in invoicesForOrder
            order by i.CreatedAt
            select i.InvoiceNo
        ).LastOrDefault()
    }

The way this gets translated is by getting all the distinct order numbers
in one subquery and then going over the result and selecting each group
of invoices explicitly with a where-clause:

    SELECT 
        ...
        FROM ( SELECT 
            ...
            (SELECT -- The number of invoices in each order
                COUNT(1) AS [A1]
                FROM [dbo].[Invoices] AS [Extent3]
                WHERE ([Distinct1].[OrderNo] = [Extent3].[OrderNo])) AS [C1]
            FROM   (SELECT DISTINCT -- All the order numbers we go over
                [Extent1].[OrderNo] AS [OrderNo]
                FROM [dbo].[Invoices] AS [Extent1] ) AS [Distinct1]
            OUTER APPLY  ( -- The latest invoice in each order
                SELECT TOP (1) [Project2].[InvoiceNo] AS [InvoiceNo]
                FROM ( SELECT 
                    [Extent2].[InvoiceNo] AS [InvoiceNo], 
                    [Extent2].[CreatedAt] AS [CreatedAt]
                    FROM [dbo].[Invoices] AS [Extent2]
                    WHERE ([Distinct1].[OrderNo] = [Extent2].[OrderNo])
                )  AS [Project2]
                ORDER BY [Project2].[CreatedAt] DESC ) AS [Limit1]
        )  AS [Project3]

That query isn't optimal: The counting could be build into the subquery
selecting the order numbers:

    SELECT 
        ...
        FROM ( SELECT 
            ...
            FROM   (SELECT -- All the order numbers we go over
                [Extent1].[OrderNo] AS [OrderNo],
                COUNT(1) AS [A1]
                FROM [dbo].[Invoices] AS [Extent1]
                GROUP BY [Extent1].[OrderNo]
            ) AS [Distinct1]
            OUTER APPLY  (...) AS [Limit1]
        )  AS [Project3]

It's possible that there's an efficiency difference between the two. So
in cases where it matters, the query author could write the latter
in JavaScript specifically like this:

    processQuery(query(() => {
        const orderNoWithInvoiceCount = query(() => {
            const i = from(invoices);
            groupBy(i.orderNo);
            return { orderNo: i.orderNo, numberOfInvoices: count() }
        })
        const { orderNo, numberOfInvoices } = from(orderNoWithInvoiceCount)
        const latestInvoice = outerApply(query(() => {
            const i2 = from(invoices)
            where(i2.orderNo.eq(orderNo))
            orderByDesc(i2.createdAt)
            fetchOnly(1)
            return i2
        }))

        return { orderNo, numberOfInvoices, latestInvoice };
    }))

It's more verbose than the LINQ version, but since it follows
SQL's concepts more closely

- it expresses better what the resulting SQL will be like,
- it gives the query author more control and
- it's much (really, a lot) simpler to implement.

I feel strongly that this is the route to go.

# Making a Pit Stop

So this is about what I have so far and I wanted to share.

All queries using build with `query()` in this readme can be found in `app.ts` 
and will render correctly, except that the selections are not flattened and 
implicit joins from navigational properties not expanded. So when you look at 
the rendered SQL it looks like this: 

    SELECT { x: x1, y: { nested: n1 } } FROM ...

There is more that is considered in this readme and not yet implemented, but 
all that should be straight-forward: I don't expect any more surprises. 
However, I do expect it to be *a lot* of work to be a usable ORM.

It may be possible to integrate this way of building queries into existing
ORMs as there are no restrictions placed on the entity types.

Since I don't see myself using JavaScript/TypeScript for database
access right away, this is the point where my curiosity
is satisfied for the time being.

If you want to chat about this, feel free to drop a ticket in this repo.
