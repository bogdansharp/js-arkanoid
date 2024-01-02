
# patern 1
colors = [3355443, 16711680, 3355443, 16711680]
cn = 2
for col in range(10):
    x = col * 10
    shift = 0
    for ir in range(2, 12):
        if ir == 7:
            shift = (shift + 1) % 2
        print(f"[{ir}, {x}, 2, {colors[shift]}, 1], [{13-ir}, {x}, 2, {colors[shift+1]}, 1],")
        shift = (shift + 1) % 2
        x += 1