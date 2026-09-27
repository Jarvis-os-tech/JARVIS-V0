CXX      := g++
CXXFLAGS := -O3 -Wall -Wextra -std=c++17
BINDIR   := bin

SOURCES  := $(wildcard *.cpp)
TARGETS  := $(patsubst %.cpp,$(BINDIR)/%,$(SOURCES))

.PHONY: all clean

all: $(BINDIR) $(TARGETS)

$(BINDIR):
	mkdir -p $(BINDIR)

$(BINDIR)/%: %.cpp
	$(CXX) $(CXXFLAGS) -o $@ $<

clean:
	rm -rf $(BINDIR)
