## Features built
- Auth: register/login with Farmer or Buyer role, role-based dashboard protection
- Farmer: add and delete product listings
- Marketplace: public list of active products

- Buyer: product detail page, place orders (validated in a database function), order history
- Farmer: incoming orders view
- Security: orders are created only via the `place_order` database function; price is read from the product, never from the browser