"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Menu,
  X,
  ShoppingBag,
  Search,
  Heart,
  User,
  ChevronRight,
  Truck,
  Shield,
  RotateCcw,
  Star,
  ArrowRight,
  Instagram,
  Twitter,
  Facebook,
} from "lucide-react"
import { toast } from "sonner"

const products = [
  {
    id: 1,
    name: "Classic White Tee",
    price: 49,
    originalPrice: 69,
    category: "T-Shirts",
    image: "/white-cotton-t-shirt-minimal-fashion.jpg",
    badge: "Sale",
  },
  { id: 2, name: "Navy Wool Blazer", price: 299, category: "Jackets", image: "/navy-blue-wool-blazer-professional-fashion.jpg" },
  { id: 3, name: "Slim Fit Chinos", price: 89, category: "Pants", image: "/beige-slim-fit-chinos-pants-fashion.jpg" },
  {
    id: 4,
    name: "Cashmere Sweater",
    price: 199,
    originalPrice: 249,
    category: "Sweaters",
    image: "/grey-cashmere-sweater-luxury-fashion.jpg",
    badge: "Sale",
  },
  { id: 5, name: "Leather Sneakers", price: 159, category: "Shoes", image: "/white-leather-sneakers-minimal-fashion.jpg" },
  { id: 6, name: "Denim Jacket", price: 179, category: "Jackets", image: "/blue-denim-jacket-casual-fashion.jpg", badge: "New" },
  { id: 7, name: "Linen Shirt", price: 79, category: "Shirts", image: "/white-linen-shirt-summer-fashion.jpg" },
  { id: 8, name: "Wool Coat", price: 399, category: "Coats", image: "/navy-wool-coat-winter-fashion-elegant.jpg", badge: "Bestseller" },
]

const categories = ["All", "T-Shirts", "Shirts", "Jackets", "Pants", "Sweaters", "Shoes", "Coats"]

export default function ShopPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [cartCount, setCartCount] = useState(0)
  const [wishlist, setWishlist] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" })

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const addToCart = (productName: string) => {
    setCartCount((prev) => prev + 1)
    toast.success(`${productName} added to cart`)
  }

  const toggleWishlist = (productId: number) => {
    setWishlist((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]))
    toast.success(wishlist.includes(productId) ? "Removed from wishlist" : "Added to wishlist")
  }

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success("Message sent! We'll get back to you soon.")
    setContactForm({ name: "", email: "", message: "" })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Announcement Bar */}
      <div className="bg-primary text-primary-foreground py-2 text-center text-sm">
        <p>
          Free shipping on orders over $150 | Use code <span className="font-semibold">STYLE20</span> for 20% off
        </p>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link href="/shop" className="flex items-center">
              <span className="text-2xl font-bold tracking-tight text-primary">LUXE</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {["New Arrivals", "Men", "Women", "Accessories", "Sale"].map((item) => (
                <Link
                  key={item}
                  href="#"
                  className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors duration-200"
                >
                  {item}
                </Link>
              ))}
            </nav>

            {/* Right Icons */}
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 bg-muted rounded-full px-4 py-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-0 bg-transparent focus-visible:ring-0 w-40 h-6 p-0 text-sm"
                />
              </div>
              <Button variant="ghost" size="icon" className="relative">
                <Heart className="w-5 h-5" />
                {wishlist.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {wishlist.length}
                  </span>
                )}
              </Button>
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Button>
              <Button variant="ghost" size="icon" className="hidden lg:flex">
                <User className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-background">
            <div className="px-4 py-4 space-y-4">
              <div className="flex items-center gap-2 bg-muted rounded-full px-4 py-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-0 bg-transparent focus-visible:ring-0 h-6 p-0 text-sm"
                />
              </div>
              {["New Arrivals", "Men", "Women", "Accessories", "Sale"].map((item) => (
                <Link
                  key={item}
                  href="#"
                  className="block py-2 text-foreground/80 hover:text-primary transition-colors"
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-0">
              {/* Hero Content */}
              <div className="flex flex-col justify-center px-6 py-16 lg:px-12 lg:py-24 bg-gradient-to-br from-primary/5 to-background">
                <Badge variant="secondary" className="w-fit mb-6">
                  New Collection 2025
                </Badge>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-primary leading-tight">
                  Elevate Your
                  <br />
                  <span className="text-foreground">Style</span>
                </h1>
                <p className="mt-6 text-lg text-muted-foreground max-w-md leading-relaxed">
                  Discover our curated collection of timeless pieces designed for the modern individual. Quality meets
                  elegance.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <Button size="lg" className="group">
                    Shop Collection
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button size="lg" variant="outline">
                    View Lookbook
                  </Button>
                </div>
              </div>
              {/* Hero Image */}
              <div className="relative h-[400px] lg:h-[600px]">
                <img src="/fashion-model-wearing-elegant-navy-blue-outfit-pro.jpg" alt="Fashion Model" className="w-full h-full object-cover" />
                <div className="absolute bottom-6 left-6 bg-background/90 backdrop-blur-sm p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Featured</p>
                  <p className="font-semibold">Navy Wool Collection</p>
                  <p className="text-primary font-bold">From $199</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 border-y border-border bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Free Shipping</h3>
                  <p className="text-sm text-muted-foreground">On orders over $150</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <RotateCcw className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Easy Returns</h3>
                  <p className="text-sm text-muted-foreground">30-day return policy</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Secure Payment</h3>
                  <p className="text-sm text-muted-foreground">100% secure checkout</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Category Filter */}
        <section className="py-8 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="flex-shrink-0 rounded-full"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Product Grid */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-bold">Our Products</h2>
              <Link href="#" className="text-sm text-primary hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="group overflow-hidden border-0 shadow-none hover:shadow-lg transition-all duration-300"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {product.badge && (
                      <Badge
                        className={`absolute top-3 left-3 ${
                          product.badge === "Sale"
                            ? "bg-red-500"
                            : product.badge === "New"
                              ? "bg-primary"
                              : "bg-amber-500"
                        } text-white`}
                      >
                        {product.badge}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm hover:bg-background"
                      onClick={() => toggleWishlist(product.id)}
                    >
                      <Heart
                        className={`w-4 h-4 ${wishlist.includes(product.id) ? "fill-red-500 text-red-500" : ""}`}
                      />
                    </Button>
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Button className="w-full" size="sm" onClick={() => addToCart(product.name)}>
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
                    <h3 className="font-medium text-sm md:text-base truncate">{product.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-bold text-primary">${product.price}</span>
                      {product.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">${product.originalPrice}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < 4 ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                        />
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">(24)</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Banner Section */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Summer Sale</h2>
                <p className="text-lg opacity-90 mb-6">
                  Up to 50% off on selected items. Don't miss out on our biggest sale of the season.
                </p>
                <Button variant="secondary" size="lg">
                  Shop Sale
                </Button>
              </div>
              <div className="relative h-[300px] rounded-lg overflow-hidden">
                <img src="/summer-fashion-sale-clothing-promotion-elegant.jpg" alt="Summer Sale" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* Contact Form Section */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-4">Get in Touch</h2>
              <p className="text-muted-foreground">Have a question? We'd love to hear from you.</p>
            </div>
            <form onSubmit={handleContactSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    Name
                  </label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={contactForm.name}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    className="bg-background"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={contactForm.email}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                    className="bg-background"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={4}
                  placeholder="How can we help you?"
                  value={contactForm.message}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, message: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <Button type="submit" size="lg" className="w-full sm:w-auto">
                Send Message
              </Button>
            </form>
          </div>
        </section>

        {/* Newsletter */}
        <section className="py-16 border-t border-border">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Join Our Newsletter</h2>
            <p className="text-muted-foreground mb-6">
              Be the first to know about new collections and exclusive offers.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                toast.success("Thank you for subscribing!")
              }}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <Input type="email" placeholder="Enter your email" className="flex-1" required />
              <Button type="submit">Subscribe</Button>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <span className="text-2xl font-bold">LUXE</span>
              <p className="mt-4 text-sm opacity-80">
                Premium fashion for the modern individual. Quality, style, and sustainability.
              </p>
              <div className="flex gap-4 mt-6">
                <Link href="#" className="hover:opacity-80 transition-opacity">
                  <Instagram className="w-5 h-5" />
                </Link>
                <Link href="#" className="hover:opacity-80 transition-opacity">
                  <Twitter className="w-5 h-5" />
                </Link>
                <Link href="#" className="hover:opacity-80 transition-opacity">
                  <Facebook className="w-5 h-5" />
                </Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Shop</h4>
              <ul className="space-y-2 text-sm opacity-80">
                <li>
                  <Link href="#" className="hover:opacity-100">
                    New Arrivals
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:opacity-100">
                    Bestsellers
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:opacity-100">
                    Sale
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:opacity-100">
                    Collections
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Help</h4>
              <ul className="space-y-2 text-sm opacity-80">
                <li>
                  <Link href="#" className="hover:opacity-100">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:opacity-100">
                    Shipping
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:opacity-100">
                    Returns
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:opacity-100">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm opacity-80">
                <li>
                  <Link href="#" className="hover:opacity-100">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:opacity-100">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:opacity-100">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:opacity-100">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-primary-foreground/20 text-center text-sm opacity-80">
            <p>&copy; {new Date().getFullYear()} LUXE. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
