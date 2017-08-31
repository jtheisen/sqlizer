import { MemberExpression, ScalarExpression, sqlify } from './expression';
import { asSet, defineTable, from, join, query, Scalar, SqlSet } from './fluent';
import { defReference, defString, Table } from './entities';
import * as tape from 'tape';
import 'reflect-metadata';

 

/*

We do *only* the monadic version at first. This is in fact easier (as the monadic expressions reflect
complete sql query units) and it's what I seek to prove possible anyway.

We now have two sets of types so far:
- Typed Scalar/SqlSet for fluid syntax and
- Untyped Expressions representing an intermediate form of the query

The expression already shows the structure the query will have (the number of subqueries, for example).
It does not yet, however, contain the following:
- There are no aliases in the expressions. Those will be given in the final render step.
- Implicit joins necessitated through accessing a scalar navigational property.
- Implicit applies?

*/

//var x: PropertyDescriptor

@Table
class Order {
    orderNo = defString()
    
    //invoices = def
}

@Table
class Invoice {
    invoiceNo = defString()
    orderNo = defString()

    order = defReference(Order)
}

var invoices = defineTable("invoices", new Invoice());
var orders = defineTable("orders", new Order());

// var myEntity = new Entity();


var temp = () => {
    var o = from(orders);
    var i = join(invoices).on(i => o.orderNo.eq(i.orderNo));

    return { ono: o.orderNo, ino: i.invoiceNo };
}

var myQuery = query(temp)

// var y = () => {
//     var y = from(myQuery)
//     y.x.age.eq(y.x.age)
// }

console.info(sqlify(myQuery.expression))

// tape('', t => {
// }
// )
