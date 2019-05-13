@if(count($searchGoods) >= 1)
    @foreach ($searchGoods as $good)
        <?php
        $portions=$good->portions()->get();
        $category=$good->category()->first();
        ?>

        <div class="col-xl-3 col-lg-6">
            <a class="nav-link pr-0" href="#" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                <div class="card card-stats mb-4 mb-xl-3 pointer breath">
                    <div class="card-body">
                        <div class="row">
                            <div class="col">
                                <span class="h2 font-weight-bold mb-0">{{ $good->name }}</span>
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
                            <span class="text-success mr-2"><i class="fas fa-box"></i> {{ $good->portions()->count() }}</span>
                            <span class="text-nowrap">Portion count</span>
                        </p>
                    </div>
                </div>
            </a>
            <div class="dropdown-menu dropdown-menu-inner">
                <div class=" dropdown-header noti-title">
                    <h6 class="text-overflow m-0">Chose Portion</h6>
                </div>
                <div class="dropdown-divider"></div>
                @foreach($portions as $portion)
                    <a href="#" onclick="add({{ $portion->id }})" class="dropdown-item">
                        <i class="ni ni-button-play"></i>
                        <span>{{ $portion->portion }} ({{ $portion->price }})</span>
                    </a>
                @endforeach
            </div>
        </div>
    @endforeach
@else
    <div style="margin-left:37%;position: relative;max-width:1000px;padding-left:2%; padding-top: 2%; " >
        <h1> Whoops! </h1>
        <h4>No goods found</h4>
    </div>
@endif