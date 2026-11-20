// the product's router, stood in for: a Link is a plain link here
export function Link({ to, children, ...rest }) { return <a href={typeof to === 'string' ? to : '#'} {...rest}>{children}</a>; }
