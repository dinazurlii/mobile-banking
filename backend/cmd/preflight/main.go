package main

import (
	"fmt"
	"os"
	"os/exec"
)

func main() {
	fmt.Println("=====================================================")
	fmt.Println("   SimpleBank Preflight Automated Test Runner       ")
	fmt.Println("=====================================================")
	fmt.Println("[Preflight] Executing Go Unit & Integration Tests...")

	cmd := exec.Command("go", "test", "-v", "./tests/...")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		fmt.Println("\n❌ [Preflight Checklist] PREFLIGHT TESTS FAILED!")
		fmt.Println("❌ Application startup blocked due to failing tests.")
		os.Exit(1)
	}

	fmt.Println("\n✅ [Preflight Checklist] ALL UNIT & INTEGRATION TESTS PASSED!")
	fmt.Println("=====================================================\n")
}
