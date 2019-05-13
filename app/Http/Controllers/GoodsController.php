<?php

namespace App\Http\Controllers;

use App\Goods;
use App\Http\Requests\GoodsRequest;
use Illuminate\Http\Request;

class GoodsController extends Controller
{

    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('admin');
    }

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Goods $model)
    {
        return view('goods.index', ['goods' => $model->orderBy('updated_at', 'desc')->paginate(15)]);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        return view('goods.create');
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(GoodsRequest $request, Goods $model)
    {
        $model->create($request->all());

        return redirect()->route('goods.index')->withStatus(__('Goods successfully created.'));
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  \App\Goods  $goods
     * @return \Illuminate\Http\Response
     */
    public function edit($id)
    {
        $goods=Goods::find($id);
        return view('goods.edit', compact('goods'));
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Goods  $goods
     * @return \Illuminate\Http\Response
     */
    public function update(GoodsRequest $request, $id)
    {
        $goods=Goods::find($id);
        $goods->update($request->all());

        return redirect()->route('goods.index')->withStatus(__('Goods successfully updated.'));
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Goods  $goods
     * @return \Illuminate\Http\Response
     */
    public function destroy(Goods $good)
    {
        $good->delete();

        return redirect()->route('goods.index')->withStatus(__('Goods successfully deleted.'));
    }
}
