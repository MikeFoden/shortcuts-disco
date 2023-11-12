import { AppShortcuts, Shortcuts } from "../model/internal/internal-models";
import { parseInputShortcuts } from "./input-parser";
import Validator from "./validator";
import { useFetch } from "@raycast/utils";
import { AllApps } from "../model/input/input-models";
import useKeyCodes from "./key-codes-provider";
import { useEffect, useState } from "react";
import { CacheManager } from "../cache/cache-manager";

const cacheManager = new CacheManager();
const CACHE_KEY = "shortcuts";

export default function useAllShortcuts() {
  const cachedItem = cacheManager.getCachedItem<Shortcuts>(CACHE_KEY);
  const [shouldUpdateCache] = useState(!cacheManager.cacheItemIsValid(cachedItem));
  const keyCodesResult = useKeyCodes();
  const [shortcuts, setShortcuts] = useState<Shortcuts>(
    cachedItem
      ? cachedItem.data
      : {
          applications: [],
        }
  );

  const fetchResult = useFetch<AllApps>("https://shortcuts.solomk.in/combined-apps.json", {
    keepPreviousData: true,
    onWillExecute: (parameters) => {
      console.log("Will fetch shortcuts");
    },
    onData: (data) => {
      console.log("Shortcuts data received");
    },
    execute: shouldUpdateCache,
  });

  useEffect(() => {
    if (keyCodesResult.isLoading || fetchResult.isLoading) {
      return;
    }
    if (shouldUpdateCache) {
      const updatedShortcuts = new ShortcutsProvider(
        fetchResult.data!,
        new Validator(keyCodesResult.data!)
      ).getShortcuts();
      cacheManager.setValueWithTtl(CACHE_KEY, updatedShortcuts);
      setShortcuts(updatedShortcuts);
    }
  }, [keyCodesResult.isLoading, fetchResult.isLoading, shouldUpdateCache]);

  return {
    isLoading: shortcuts.applications.length === 0,
    shortcuts: shortcuts,
  };
}

class ShortcutsProvider {
  constructor(
    private readonly allApps: AllApps,
    private readonly validator: Validator
  ) {}

  public getShortcuts(): Shortcuts {
    this.validator.validate(this.allApps.list);
    return {
      applications: parseInputShortcuts(this.allApps.list),
    };
  }

  public getShortcutsByApp(bundleId: string): AppShortcuts | undefined {
    const shortcuts = this.getShortcuts();
    return shortcuts.applications.find((app) => app.bundleId === bundleId);
  }
}
