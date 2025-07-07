# CLAUDE.md

Response in Japanese.
Comment in Japanese.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a monorepo for the Estate state management library with three main packages:
- `core/` - Core state management functionality (@e-state/core)
- `react/` - React bindings (@e-state/react) 
- `solid/` - Solid.js bindings (@e-state/solid)

Each package has its own example projects demonstrating usage.

## Commands

### Building packages:
```bash
# Build any package
cd core/ && npm run build
cd react/ && npm run build  
cd solid/ && npm run build

# Watch mode for development
cd core/ && npm run build:w
cd react/ && npm run build:w
```

### Publishing packages:
```bash
# Publish with version bump (patch)
cd core/ && npm run p
cd react/ && npm run p
cd solid/ && npm run p
```

### Running examples:
```bash
# Next.js examples
cd core/example && npm run dev
cd react/example && npm run dev

# Vite React example
cd react/vite-example && npm run dev

# Solid.js example  
cd solid/example && npm run dev
```

## Architecture

### Core Package Structure
- `GlobalStore.ts` - Singleton store implementation with middleware support
- `createEstate.ts` - Main factory function that creates estate instance with persistence and subscription capabilities
- `createUpdater.ts` - Setter function factory for state updates
- `utils.ts` - Utility functions for deep cloning, object manipulation, and JSON serialization
- `debag.ts` - Debug utilities

### React Package
- Wraps core functionality with React-specific hooks
- Provides `useEstate` hook for component state binding
- Depends on `@e-state/core` package

### Solid Package  
- Provides Solid.js reactive bindings
- Uses `@solid-primitives/storage` for persistence
- Independent implementation for Solid.js ecosystem

### Key Features
- **Persistence**: Supports localStorage/custom storage with JSON serialization
- **Middleware**: Pluggable middleware system for state changes
- **Subscriptions**: Fine-grained subscriptions to specific state keys
- **Type Safety**: Full TypeScript support with type inference
- **Framework Agnostic**: Core package works with any framework

### State Management Pattern
The library uses a singleton GlobalStore pattern where:
1. `createEstate()` initializes the store with initial state
2. State is organized by "slices" (top-level keys)
3. Each slice contains key-value pairs
4. Persistence is opt-in per slice
5. Subscriptions are available at the key level within slices

## Development Notes

- Node version managed with Volta (22.14.0)
- TypeScript compilation with `tsc`
- No test framework currently configured
- Uses `rfdc` for fast deep cloning
- Persistence uses custom JSON serialization with replacer/reviver functions