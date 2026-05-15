import re

with open('src/components/features/quotes/QuoteBuilder.tsx', 'r') as f:
    content = f.read()

# Replace the CardContent for items completely
start_marker = "                            <CardContent className=\"space-y-4\">\n                                {items.map((item, index) => ("
end_marker = "                                {form.formState.errors.items?.root && ("

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    old_section = content[start_idx:end_idx]
    
    new_section = r"""                            <CardContent className="space-y-4">
                                {items.map((item, index) => {
                                    const qty = parseFloat(String(watchItems[index]?.quantity)) || 0
                                    const cost = parseFloat(String(watchItems[index]?.unit_cost)) || 0
                                    return (
                                        <div key={item.id} className="flex gap-2 items-start bg-zinc-950 p-2 rounded-md border border-zinc-800">
                                            <div className="flex-1">
                                                <Input placeholder="Description" {...form.register(`items.${index}.description` as const)} className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-600 outline-none" />
                                            </div>
                                            <div className="w-24">
                                                <Input type="number" step="0.01" placeholder="Qté" {...form.register(`items.${index}.quantity` as const)} className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-600 outline-none" />
                                            </div>
                                            <div className="w-20">
                                                <Input placeholder="Unité" {...form.register(`items.${index}.unit` as const)} className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-600 outline-none" />
                                            </div>
                                            <div className="w-28">
                                                <Input type="number" step="0.01" placeholder="Coût $" {...form.register(`items.${index}.unit_cost` as const)} className="bg-zinc-900 border-zinc-800 focus-visible:ring-zinc-600 outline-none" />
                                            </div>
                                            <div className="w-28 h-10 flex items-center justify-end px-3 font-medium text-zinc-300">
                                                ${(qty * cost).toFixed(2)}
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-400 hover:text-red-300 hover:bg-red-950/50">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )
                                })}
"""
    new_content = content[:start_idx] + new_section + content[end_idx:]
    with open('src/components/features/quotes/QuoteBuilder.tsx', 'w') as f:
        f.write(new_content)
    print("Success replacing!")
else:
    print("Markers not found!")

