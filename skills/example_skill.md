# Skill: Code Quality Standards

## When to Apply
Apply this skill when writing any code in this project.

## Guidelines

### General Principles
1. **Write self-documenting code** - Use descriptive variable and function names
2. **Keep functions small** - Each function should do one thing well
3. **Handle errors gracefully** - Always anticipate what could go wrong
4. **Write tests** - Cover critical paths and edge cases

### Code Structure
- Place imports at the top of files, organized by: standard library, third-party, local
- Use consistent indentation (spaces, not tabs)
- Add blank lines between logical sections

### Documentation
- Add docstrings to public functions explaining what they do, their parameters, and return values
- Use inline comments sparingly - only when the "why" isn't obvious from the code

## Examples

### Good Example
```python
def calculate_total_price(items: list[dict], discount_percent: float = 0) -> float:
    """
    Calculate total price of items with optional discount.

    Args:
        items: List of item dicts with 'price' and 'quantity' keys
        discount_percent: Discount to apply (0-100)

    Returns:
        Total price after discount
    """
    if not items:
        return 0.0

    subtotal = sum(item['price'] * item['quantity'] for item in items)
    discount = subtotal * (discount_percent / 100)
    return subtotal - discount
```

### Bad Example
```python
def calc(i, d=0):
    # calculate total
    t = 0
    for x in i:
        t += x['price'] * x['quantity']
    return t - (t * d / 100)
```

## Common Mistakes to Avoid
1. **Magic numbers** - Use named constants instead of hard-coded values
2. **Deep nesting** - Use early returns to flatten code
3. **Silent failures** - Log or raise exceptions when things go wrong
4. **Untested edge cases** - Consider empty inputs, large inputs, invalid inputs
5. **Hardcoded values** - Use configuration or environment variables
