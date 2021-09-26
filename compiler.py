import os


if __name__ == "__main__":
    print("Deleting Old Cache")
    os.system("rm -r -f .out")
    print("Compiling...")
    os.system("tsc")

    for file in os.listdir("."):
        if file.startswith("."):
            continue # Skip files starts with ".", includes .git and .out
        os.system(f"cp -r -f {file} .out/")