@if(count($searchCategories) >= 1)
    @foreach ($searchCategories as $category)
        <div class="col-xl-3 col-lg-6">
            <div class="card card-stats mb-4 mb-xl-3 breath pointer">
                <a href="{{ url('/category/'.$category->name) }}">
                    <div class="card-body">
                        <div class="row">
                            <div class="col">
                                <span class="h2 font-weight-bold mb-0">{{ $category->name }}</span>
                            </div>
                            <div class="col-auto">
                                @if($category->name=="Appetizers")
                                    <div class="icon icon-shape bg-orange text-white rounded-circle shadow">
                                        <i class="fas fa-cookie-bite"></i>
                                    </div>
                                @elseif($category->name=="Entrees")
                                    <div class="icon icon-shape bg-danger text-white rounded-circle shadow">
                                        <i class="fas fa-pizza-slice"></i>
                                    </div>
                                @elseif($category->name=="Drinks")
                                    <div class="icon icon-shape bg-blue text-white rounded-circle shadow">
                                        <i class="fas fa-wine-glass-alt"></i>
                                    </div>
                                @elseif($category->name=="Desserts")
                                    <div class="icon icon-shape bg-pink text-white rounded-circle shadow">
                                        <i class="fas fa-ice-cream"></i>
                                    </div>
                                @endif
                            </div>
                        </div>
                        <p class="mt-3 mb-0 text-muted text-sm">
                            <span class="text-success mr-2"><i class="fas fa-concierge-bell"></i> {{ $category->goods()->distinct('name')->count('name') }}</span>
                            <span class="text-nowrap">Goods count</span>
                        </p>
                    </div>
                </a>
            </div>
        </div>
    @endforeach
@else
    <div style="margin-left:37%;position: relative;max-width:1000px;padding-left:2%; padding-top: 2%; " >
        <h1> Whoops! </h1>
        <h4>No categories found</h4>
    </div>
@endif