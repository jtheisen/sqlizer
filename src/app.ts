import { MemberExpression, ElementExpression, sqlify } from './expression';
import { asSet, ConcreteSqlSet, defineTable, from, join, query, SqlElement, SqlSet } from './fluent';
import * as tape from 'tape';
import 'reflect-metadata';

 

/*

We do *only* the monadic version at first. This is in fact easier (as the monadic expressions reflect
complete sql query units) and it's what I seek to prove possible anyway.

We now have two sets of types so far:
- Typed SqlElement/SqlSet for fluid syntax and
- Untyped Expressions representing an intermediate form of the query

The expression already shows the structure the query will have (the number of subqueries, for example).
It does not yet, however, contain the following:
- There are no aliases in the expressions. Those will be given in the final render step.
- Implicit joins necessitated through accessing a element navigational property.
- Implicit applies?

*/

//var x: PropertyDescriptor

function toMany<T>(ctor: { new (): T }): T[] {
    var result: any = []
    result.elementConstructor = ctor
    return result
}

class Order {
    orderNo = ''
    
    invoices = toMany(Invoice)
}

class Invoice {
    invoiceNo = ''
    orderNo = ''

    order = new Order()
}

var invoices = defineTable("invoices", new Invoice());
var orders = defineTable("orders", new Order());

// var myEntity = new Entity();

function processQuery<T>(set: ConcreteSqlSet<T>)
{
    console.info(sqlify(set.expression))
}

processQuery(query(() => {
    var o = from(orders);
    var i = join(invoices).on(i => o.orderNo.eq(i.orderNo));

    return { ono: o.orderNo, ino: i.invoiceNo, extra: i.order.orderNo };
}))

processQuery(query(() => {
    var o = from(orders);
    var i = from(o.invoices)
    
    return { ono: o.orderNo, ino: i.invoiceNo };
}))
