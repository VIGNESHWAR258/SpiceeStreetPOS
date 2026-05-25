'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SearchFilter } from '@/components/common/search-filter';
import { PriceDisplay } from '@/components/common/price-display';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  dietaryType: 'veg' | 'non-veg';
  image: string;
}

export default function MenuAvailabilityPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [menuState, setMenuState] = useState<Record<string, boolean>>({});
  const [showStockedOut, setShowStockedOut] = useState(false);

  useEffect(() => {
    fetch('/api/menu')
      .then((r) => r.json())
      .then((data: Record<string, unknown>[]) => {
        if (Array.isArray(data)) {
          const mapped = data.map((item) => ({
            id: item.id as string,
            name: item.name as string,
            description: item.description as string,
            price: parseFloat(item.price as string),
            category: item.category as string,
            available: !!item.available,
            dietaryType: ((item.dietary_type as string) ?? 'veg') === 'non-veg' ? 'non-veg' as const : 'veg' as const,
            image: (item.image as string) ?? '',
          }));
          setMenuItems(mapped);
          setMenuState(mapped.reduce((acc, item) => ({ ...acc, [item.id]: item.available }), {}));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = ['all', ...new Set(menuItems.map((item) => item.category))];

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesStockFilter = !showStockedOut || !menuState[item.id];
      return matchesSearch && matchesCategory && matchesStockFilter;
    });
  }, [menuItems, searchTerm, selectedCategory, showStockedOut, menuState]);

  const toggleAvailability = async (itemId: string, available: boolean) => {
    setMenuState((prev) => ({ ...prev, [itemId]: available }));
    try {
      await fetch(`/api/menu/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...menuItems.find((item) => item.id === itemId),
          available,
        }),
      });
      setMenuItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, available } : item)));
    } catch {
      setMenuState((prev) => ({ ...prev, [itemId]: !available }));
    }
  };

  const toggleAll = async (category: string, available: boolean) => {
    const categoryItems =
      category === 'all'
        ? menuItems
        : menuItems.filter((item) => item.category === category);
    
    setMenuState((prev) => {
      const newState = { ...prev };
      categoryItems.forEach((item) => {
        newState[item.id] = available;
      });
      return newState;
    });

    await Promise.all(
      categoryItems.map((item) =>
        fetch(`/api/menu/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item, available }),
        })
      )
    );
    setMenuItems((prev) => prev.map((item) => (category === 'all' || item.category === category ? { ...item, available } : item)));
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading menu...</div>;

  const availableCount = Object.values(menuState).filter(Boolean).length;
  const unavailableCount = Object.keys(menuState).length - availableCount;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-2xl md:text-3xl font-bold text-foreground">Menu Item Availability</h1>
        <p className="text-muted-foreground">Toggle menu items on or off for customers</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{availableCount}</div>
            <p className="text-xs text-muted-foreground">Ready to order</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unavailable Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{unavailableCount}</div>
            <p className="text-xs text-muted-foreground">Out of service</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(menuState).length}</div>
            <p className="text-xs text-muted-foreground">In menu</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((availableCount / Object.keys(menuState).length) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">Available</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAll('all', true)}
              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
            >
              Enable All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAll('all', false)}
              className="bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
            >
              Disable All
            </Button>
            <Button
              variant={showStockedOut ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowStockedOut((v) => !v)}
              className={showStockedOut ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-300'}
            >
              {showStockedOut ? `Stocked Out (${unavailableCount})` : `Show Stocked Out${unavailableCount > 0 ? ` (${unavailableCount})` : ''}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="space-y-4 md:flex md:gap-4 md:space-y-0">
        <SearchFilter
          placeholder="Search items..."
          value={searchTerm}
          onChange={setSearchTerm}
          className="flex-1"
        />
        <div className="overflow-x-auto flex gap-2">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="whitespace-nowrap"
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <Card
            key={item.id}
            className={`overflow-hidden hover:shadow-lg transition-all border-l-4 ${
              menuState[item.id] ? 'border-l-green-500' : 'border-l-red-500'
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {item.category}
                  </CardDescription>
                </div>
                <Badge
                  className={
                    menuState[item.id]
                      ? 'bg-green-100 text-green-900'
                      : 'bg-red-100 text-red-900'
                  }
                >
                  {menuState[item.id] ? 'Available' : 'Unavailable'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{item.description}</p>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Status
                  </span>
                </div>
                <Switch
                  checked={menuState[item.id]}
                  onCheckedChange={(checked) => toggleAvailability(item.id, checked)}
                  aria-label={`Toggle ${item.name} availability`}
                />
              </div>
              {!menuState[item.id] && (
                <button
                  onClick={() => toggleAvailability(item.id, true)}
                  className="w-full text-sm font-medium py-1.5 px-3 rounded-md bg-green-600 hover:bg-green-700 text-white transition-colors"
                >
                  Mark Available (Stock Replenished)
                </button>
              )}

              <div className="bg-orange-50 px-3 py-2 rounded-lg border border-orange-200">
                <PriceDisplay amount={item.price} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No items found matching your filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
